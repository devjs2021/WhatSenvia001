import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import crypto from 'crypto'
import { Readable } from 'stream'
import { env } from '../../../config/env.js'
import { db } from '../../../config/database.js'
import { whatsappSessions } from '../../../infrastructure/database/schema/whatsapp-sessions.js'
import { chatMessages } from '../../../infrastructure/database/schema/chat.js'
import { messages } from '../../../infrastructure/database/schema/messages.js'
import { contacts } from '../../../infrastructure/database/schema/contacts.js'
import { metaTemplates } from '../../../infrastructure/database/schema/meta-templates.js'
import { eq, and, or } from 'drizzle-orm'
import { notifyPhoneQualityChange, notifyTemplateQualityChange, notifyAccountAlert } from '../services/quality-alert-notifier.js'
import { chatBroadcast } from '../../chat/websocket/chat-broadcast.js'
import { flowExecutor } from '../../bot-builder/services/flow-executor.service.js'
import { chatService } from '../../chat/services/chat.service.js'
import { mediaStorageService } from '../../chat/services/media-storage.service.js'
import { decrypt } from '../../../infrastructure/security/encryption.service.js'
import { logger } from '../../../config/logger.js'
import { notificationService } from '../../notifications/services/notification.service.js'

function verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
  if (!env.META_APP_SECRET) return true // Skip in dev if not configured
  if (!signature) return false

  const expected = 'sha256=' + crypto
    .createHmac('sha256', env.META_APP_SECRET)
    .update(rawBody)
    .digest('hex')

  try {
    const sigBuf = Buffer.from(signature)
    const expectedBuf = Buffer.from(expected)
    if (sigBuf.length !== expectedBuf.length) return false
    return crypto.timingSafeEqual(sigBuf, expectedBuf)
  } catch {
    return false
  }
}

interface WebhookQuery {
  'hub.mode': string
  'hub.verify_token': string
  'hub.challenge': string
}

interface WebhookBody {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: string
        metadata: {
          display_phone_number: string
          phone_number_id: string
        }
        contacts?: Array<{
          profile: { name: string }
          wa_id: string
        }>
        messages?: Array<{
          from: string
          id: string
          timestamp: string
          type: string
          text?: { body: string }
          image?: { id: string; mime_type: string }
          audio?: { id: string; mime_type: string }
          video?: { id: string; mime_type: string }
          document?: { id: string; filename: string; mime_type: string }
          interactive?: { type: string; button_reply?: { id: string; title: string }; list_reply?: { id: string; title: string } }
        }>
        statuses?: Array<{
          id: string
          status: 'sent' | 'delivered' | 'read' | 'failed'
          timestamp: string
          recipient_id: string
          errors?: Array<{ code: number; title: string }>
        }>
      }
      field: string
    }>
  }>
}

export async function metaWebhookRoutes(app: FastifyInstance) {

  // GET - Verificación del webhook con Meta (sin autenticación)
  app.get('/meta-webhook', async (
    request: FastifyRequest<{ Querystring: WebhookQuery }>,
    reply: FastifyReply
  ) => {
    const mode = request.query['hub.mode']
    const token = request.query['hub.verify_token']
    const challenge = request.query['hub.challenge']

    if (mode === 'subscribe' && token === env.META_WEBHOOK_VERIFY_TOKEN) {
      logger.info('Meta webhook verified')
      return reply.status(200).send(challenge)
    }

    logger.warn('Meta webhook verification failed: invalid token')
    return reply.status(403).send('Forbidden')
  })

  // POST - Recibir mensajes y eventos de Meta (con validación de firma)
  app.post<{ Body: WebhookBody }>('/meta-webhook', {
    preParsing: async (request, reply, payload) => {
      const chunks: Buffer[] = []
      for await (const chunk of payload as AsyncIterable<Buffer>) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as any))
      }
      const rawBody = Buffer.concat(chunks)

      const signature = request.headers['x-hub-signature-256'] as string | undefined
      if (!verifyWebhookSignature(rawBody, signature)) {
        logger.warn('Meta webhook request rejected: invalid signature')
        reply.code(403).send('Forbidden')
        return
      }

      return Readable.from(rawBody)
    },
  }, async (request, reply) => {
    const body = request.body

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            const value = change.value
            const phoneNumberId = value.metadata.phone_number_id

            // Buscar la sesión asociada a este phone_number_id
            const [session] = await db
              .select()
              .from(whatsappSessions)
              .where(eq(whatsappSessions.metaPhoneNumberId, phoneNumberId))
              .limit(1)

            if (!session) {
              logger.warn({ phoneNumberId }, 'No session found for phone_number_id')
              continue
            }

            // Mensajes entrantes
            if (value.messages && value.messages.length > 0) {
              for (const message of value.messages) {
                const contactName = value.contacts?.[0]?.profile?.name || 'Desconocido'
                let messageContent = ''
                // Handle interactive button responses
                if (message.type === 'interactive') {
                  const interactive = message.interactive
                  if (interactive?.type === 'button_reply') {
                    messageContent = interactive.button_reply?.id || interactive.button_reply?.title || ''
                  } else if (interactive?.type === 'list_reply') {
                    messageContent = interactive.list_reply?.id || interactive.list_reply?.title || ''
                  }
                } else {
                  messageContent = message.text?.body || ''
                }
                const timestamp = new Date(parseInt(message.timestamp) * 1000)

                let mediaUrl: string | undefined
                let mediaType: string | undefined
                const mediaTypes = ['image', 'video', 'audio', 'document'] as const
                if (mediaTypes.includes(message.type as any)) {
                  const mediaObj = (message as any)[message.type]
                  if (mediaObj?.id && session.metaAccessToken) {
                    try {
                      const accessToken = decrypt(session.metaAccessToken)
                      const result = await mediaStorageService.downloadMetaMedia(
                        mediaObj.id,
                        accessToken,
                        mediaObj.mime_type || ''
                      )
                      if (result) {
                        mediaUrl = result.url
                        mediaType = result.mediaType
                      }
                    } catch (err: any) {
                      logger.error({ error: err.message }, 'Failed to download Meta media')
                    }
                    if (!messageContent) {
                      messageContent = message.type === 'document' && mediaObj.filename
                        ? mediaObj.filename
                        : `[${message.type}]`
                    }
                  } else if (!messageContent) {
                    messageContent = `[${message.type}]`
                  }
                }
                if (!messageContent) messageContent = `[${message.type}]`

                logger.info({ from: message.from, type: message.type, sessionId: session.id }, 'Incoming Meta message')

                try {
                  const [saved] = await db.insert(chatMessages).values({
                    sessionId: session.id,
                    phone: message.from,
                    content: messageContent,
                    direction: 'incoming',
                    senderType: 'user',
                    whatsappMessageId: message.id,
                    pushName: contactName,
                    createdAt: timestamp,
                    mediaUrl,
                    mediaType,
                  }).returning()
                  logger.debug({ sessionId: session.id }, 'Message saved to chat_messages')

                  chatBroadcast.broadcast(session.id, 'new_message', saved)
                  notificationService.create(
                    session.userId,
                    "new_chat",
                    `Nuevo mensaje de ${contactName || message.from}`,
                    messageContent.substring(0, 100),
                    { phone: message.from, sessionId: session.id }
                  ).catch(() => {})
                } catch (err: any) {
                  logger.error({ error: err.message }, 'Error saving message to chat_messages')
                }

                // Ejecutar flowExecutor para bots automatizados (igual que Baileys)
                try {
                  await flowExecutor.handleIncomingMessage(session.id, {
                    from: message.from,
                    remoteJid: message.from,
                    message: messageContent,
                    messageId: message.id,
                    isGroup: false,
                    pushName: contactName,
                  })
                  logger.debug({ sessionId: session.id }, 'Flow executor completed for Meta message')
                } catch (err: any) {
                  logger.error({ error: err.message }, 'Flow executor error for Meta message')
                }
              }
            }

            // Estados de mensajes enviados
            if (value.statuses && value.statuses.length > 0) {
              for (const status of value.statuses) {
                logger.debug({ messageId: status.id, status: status.status }, 'Meta message status update')

                // Map Meta status to internal status
                const dbStatus = status.status === 'read' ? 'read'
                  : status.status === 'delivered' ? 'delivered'
                  : status.status === 'failed' ? 'failed'
                  : 'sent'

                // Update chat_messages (live chat)
                try {
                  await db
                    .update(chatMessages)
                    .set({ status: dbStatus })
                    .where(eq(chatMessages.whatsappMessageId, status.id))
                } catch (err: any) {
                  logger.error({ error: err.message }, 'Error updating chat_messages status')
                }

                // Update campaign messages table
                try {
                  await db
                    .update(messages)
                    .set({
                      status: dbStatus === 'read' || dbStatus === 'delivered' ? 'delivered' : dbStatus,
                      errorMessage: status.errors?.[0]?.title,
                      sentAt: new Date(parseInt(status.timestamp) * 1000),
                    })
                    .where(eq(messages.whatsappMessageId, status.id))
                  logger.debug({ messageId: status.id, dbStatus }, 'Message status updated')
                } catch (err: any) {
                  logger.error({ error: err.message }, 'Error updating messages status')
                }
              }
            }
          } else if (change.field === 'history') {
            // Coexistence: batch of past messages synced from the WhatsApp Business app (up to 6 months)
            const value = change.value as any
            const phoneNumberId = value.metadata?.phone_number_id
            const [session] = await db
              .select()
              .from(whatsappSessions)
              .where(eq(whatsappSessions.metaPhoneNumberId, phoneNumberId))
              .limit(1)

            if (!session) {
              logger.warn({ phoneNumberId }, 'No session found for history sync webhook')
              continue
            }

            const businessDigits = (value.metadata?.display_phone_number || session.phone || '').replace(/\D/g, '')
            let lastPhase: string | undefined

            for (const historyEntry of value.history || []) {
              if (historyEntry.errors) {
                logger.info({ sessionId: session.id, errors: historyEntry.errors }, 'Coexistence history sync declined by business')
                await db.update(whatsappSessions).set({ historySyncStatus: 'declined' }).where(eq(whatsappSessions.id, session.id))
                continue
              }

              lastPhase = historyEntry.metadata?.phase
              for (const thread of historyEntry.threads || []) {
                const contactPhone = thread.id
                for (const msg of thread.messages || []) {
                  const [existing] = await db
                    .select({ id: chatMessages.id })
                    .from(chatMessages)
                    .where(eq(chatMessages.whatsappMessageId, msg.id))
                    .limit(1)
                  if (existing) continue

                  const fromDigits = (msg.from || '').replace(/\D/g, '')
                  const direction: 'incoming' | 'outgoing' =
                    businessDigits && fromDigits === businessDigits ? 'outgoing' : 'incoming'
                  const content = msg.type === 'text' ? (msg.text?.body || '') : `[${msg.type}]`
                  const historyStatus = msg.history_context?.status
                  const dbStatus = historyStatus === 'read' ? 'read'
                    : historyStatus === 'delivered' ? 'delivered'
                    : historyStatus === 'failed' ? 'failed'
                    : 'sent'

                  try {
                    await db.insert(chatMessages).values({
                      sessionId: session.id,
                      phone: contactPhone,
                      content: content || `[${msg.type}]`,
                      direction,
                      senderType: direction === 'outgoing' ? 'human' : 'user',
                      whatsappMessageId: msg.id,
                      status: direction === 'outgoing' ? dbStatus : 'sent',
                      createdAt: new Date(parseInt(msg.timestamp) * 1000),
                    })
                  } catch (err: any) {
                    logger.error({ error: err.message }, 'Error saving history message')
                  }
                }
              }
            }

            const newStatus = lastPhase
              ? (String(lastPhase).toLowerCase().includes('complete') ? 'completed' : 'syncing')
              : 'completed'
            await db.update(whatsappSessions).set({ historySyncStatus: newStatus }).where(eq(whatsappSessions.id, session.id))
            logger.info({ sessionId: session.id, status: newStatus }, 'Coexistence history chunk processed')
          } else if (change.field === 'smb_app_state_sync') {
            // Coexistence: business customer's WhatsApp contacts
            const value = change.value as any
            const phoneNumberId = value.metadata?.phone_number_id
            const [session] = await db
              .select()
              .from(whatsappSessions)
              .where(eq(whatsappSessions.metaPhoneNumberId, phoneNumberId))
              .limit(1)

            if (!session) {
              logger.warn({ phoneNumberId }, 'No session found for contact sync webhook')
              continue
            }

            for (const item of value.state_sync || []) {
              if (item.type !== 'contact' || item.action !== 'add') continue
              const phone = (item.contact?.phone_number || '').replace(/\D/g, '')
              if (!phone) continue
              const name = item.contact?.full_name || item.contact?.first_name || null

              try {
                const [existing] = await db
                  .select({ id: contacts.id })
                  .from(contacts)
                  .where(and(eq(contacts.userId, session.userId), eq(contacts.phone, phone)))
                  .limit(1)

                if (existing) {
                  if (name) {
                    await db.update(contacts).set({ name, updatedAt: new Date() }).where(eq(contacts.id, existing.id))
                  }
                } else {
                  await db.insert(contacts).values({ userId: session.userId, phone, name })
                }
              } catch (err: any) {
                logger.error({ error: err.message }, 'Error syncing coexistence contact')
              }
            }
            logger.info({ sessionId: session.id, count: value.state_sync?.length || 0 }, 'Coexistence contacts synced')
          } else if (change.field === 'smb_message_echoes') {
            // Coexistence: message sent by the business from the WhatsApp Business app itself
            const value = change.value as any
            const phoneNumberId = value.metadata?.phone_number_id
            const [session] = await db
              .select()
              .from(whatsappSessions)
              .where(eq(whatsappSessions.metaPhoneNumberId, phoneNumberId))
              .limit(1)

            if (!session) {
              logger.warn({ phoneNumberId }, 'No session found for message echo webhook')
              continue
            }

            for (const echo of value.message_echoes || []) {
              const [existing] = await db
                .select({ id: chatMessages.id })
                .from(chatMessages)
                .where(eq(chatMessages.whatsappMessageId, echo.id))
                .limit(1)
              if (existing) continue

              const content = echo.type === 'text' ? (echo.text?.body || '') : `[${echo.type}]`

              try {
                const [saved] = await db.insert(chatMessages).values({
                  sessionId: session.id,
                  phone: echo.to,
                  content: content || `[${echo.type}]`,
                  direction: 'outgoing',
                  senderType: 'human',
                  whatsappMessageId: echo.id,
                  status: 'sent',
                  createdAt: new Date(parseInt(echo.timestamp) * 1000),
                }).returning()

                chatBroadcast.broadcast(session.id, 'new_message', saved)
              } catch (err: any) {
                logger.error({ error: err.message }, 'Error saving message echo')
              }
            }
          } else if (change.field === 'account_update') {
            // Coexistence offboarding: business disconnected the app from the WhatsApp Business Platform settings
            const value = change.value as any
            if (value.event === 'PARTNER_REMOVED') {
              const wabaId = value.waba_info?.waba_id
              if (wabaId) {
                const updated = await db
                  .update(whatsappSessions)
                  .set({ status: 'disconnected', updatedAt: new Date() })
                  .where(eq(whatsappSessions.wabaId, wabaId))
                  .returning({ id: whatsappSessions.id })
                logger.info({ wabaId, sessions: updated.length }, 'WABA disconnected by business (PARTNER_REMOVED)')
              }
            }
          } else if (change.field === 'phone_number_quality_update') {
            // Quality rating / messaging limit change on a business phone number
            const value = change.value as any
            const displayDigits = (value.display_phone_number || '').replace(/\D/g, '')

            const candidateSessions = await db
              .select()
              .from(whatsappSessions)
              .where(eq(whatsappSessions.connectionType, 'meta_cloud'))
            const session = candidateSessions.find(
              (s) => (s.phone || '').replace(/\D/g, '') === displayDigits || s.metaPhoneNumberId === value.display_phone_number
            )

            if (!session) {
              logger.warn({ displayPhone: value.display_phone_number }, 'No session found for phone_number_quality_update webhook')
              continue
            }

            try {
              await notifyPhoneQualityChange(session.userId, session.phone || value.display_phone_number, value.event, value.current_limit)
            } catch (err: any) {
              logger.error({ error: err.message }, 'Error notifying phone quality change')
            }
          } else if (change.field === 'message_template_quality_update') {
            // Quality score change on one of the user's message templates
            const value = change.value as any
            const wabaId = entry.id

            const [template] = await db
              .select()
              .from(metaTemplates)
              .where(and(eq(metaTemplates.wabaId, wabaId), eq(metaTemplates.metaTemplateId, String(value.message_template_id))))
              .limit(1)

            if (!template) {
              logger.warn({ wabaId, templateId: value.message_template_id }, 'No template found for message_template_quality_update webhook')
              continue
            }

            try {
              await notifyTemplateQualityChange(
                template.userId,
                value.message_template_name || template.name,
                value.previous_quality_score,
                value.new_quality_score
              )
            } catch (err: any) {
              logger.error({ error: err.message }, 'Error notifying template quality change')
            }
          } else if (change.field === 'account_alerts') {
            // General Meta account alerts (messaging limits, business status, etc.)
            const value = change.value as any
            const entityId = value.entity_id

            const [session] = await db
              .select()
              .from(whatsappSessions)
              .where(or(
                eq(whatsappSessions.wabaId, entityId),
                eq(whatsappSessions.metaBusinessId, entityId),
                eq(whatsappSessions.metaPhoneNumberId, entityId)
              ))
              .limit(1)

            if (!session) {
              logger.warn({ entityId, entityType: value.entity_type }, 'No session found for account_alerts webhook')
              continue
            }

            try {
              await notifyAccountAlert(
                session.userId,
                value.alert_info?.alert_type,
                value.alert_info?.alert_severity,
                value.alert_info?.alert_description
              )
            } catch (err: any) {
              logger.error({ error: err.message }, 'Error notifying account alert')
            }
          }
        }
      }
    }

    // Meta requiere siempre respuesta 200
    return reply.status(200).send('EVENT_RECEIVED')
  })
}
