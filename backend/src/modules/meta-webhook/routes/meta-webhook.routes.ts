import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import crypto from 'crypto'
import { Readable } from 'stream'
import { env } from '../../../config/env.js'
import { db } from '../../../config/database.js'
import { whatsappSessions } from '../../../infrastructure/database/schema/whatsapp-sessions.js'
import { chatMessages } from '../../../infrastructure/database/schema/chat.js'
import { messages } from '../../../infrastructure/database/schema/messages.js'
import { eq } from 'drizzle-orm'
import { chatBroadcast } from '../../chat/websocket/chat-broadcast.js'
import { flowExecutor } from '../../bot-builder/services/flow-executor.service.js'
import { chatService } from '../../chat/services/chat.service.js'
import { mediaStorageService } from '../../chat/services/media-storage.service.js'
import { decrypt } from '../../../infrastructure/security/encryption.service.js'
import { logger } from '../../../config/logger.js'

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

                // Actualizar estado en tabla messages
                try {
                  const dbStatus = status.status === 'failed' ? 'failed' : 'sent'
                  await db
                    .update(messages)
                    .set({
                      status: dbStatus,
                      errorMessage: status.errors?.[0]?.title,
                      sentAt: new Date(parseInt(status.timestamp) * 1000),
                    })
                    .where(eq(messages.whatsappMessageId, status.id))
                  logger.debug({ messageId: status.id, dbStatus }, 'Message status updated')
                } catch (err: any) {
                  logger.error({ error: err.message }, 'Error updating message status')
                }
              }
            }
          }
        }
      }
    }

    // Meta requiere siempre respuesta 200
    return reply.status(200).send('EVENT_RECEIVED')
  })
}
