import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { env } from '../../../config/env.js'
import { db } from '../../../config/database.js'
import { whatsappSessions } from '../../../infrastructure/database/schema/whatsapp-sessions.js'
import { chatMessages } from '../../../infrastructure/database/schema/chat.js'
import { messages } from '../../../infrastructure/database/schema/messages.js'
import { eq } from 'drizzle-orm'

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
      console.log('✅ Webhook de Meta verificado correctamente')
      return reply.status(200).send(challenge)
    }

    console.log('❌ Token de verificación incorrecto')
    return reply.status(403).send('Forbidden')
  })

  // POST - Recibir mensajes y eventos de Meta
  app.post('/meta-webhook', async (
    request: FastifyRequest<{ Body: WebhookBody }>,
    reply: FastifyReply
  ) => {
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
              console.warn(`⚠️ No se encontró sesión para phone_number_id: ${phoneNumberId}`)
              continue
            }

            // Mensajes entrantes
            if (value.messages && value.messages.length > 0) {
              for (const message of value.messages) {
                const contactName = value.contacts?.[0]?.profile?.name || 'Desconocido'
                const messageContent = message.text?.body || `[${message.type}]`
                const timestamp = new Date(parseInt(message.timestamp) * 1000)

                console.log('📩 Mensaje entrante Meta:', {
                  de: message.from,
                  nombre: contactName,
                  tipo: message.type,
                  texto: messageContent,
                  sessionId: session.id,
                  timestamp: timestamp.toISOString()
                })

                // Guardar en chat_messages
                try {
                  await db.insert(chatMessages).values({
                    sessionId: session.id,
                    phone: message.from,
                    content: messageContent,
                    direction: 'incoming',
                    senderType: 'user',
                    whatsappMessageId: message.id,
                    pushName: contactName,
                    createdAt: timestamp,
                  })
                  console.log(`✅ Mensaje guardado en chat_messages (session: ${session.id})`)
                } catch (err: any) {
                  console.error('❌ Error guardando mensaje en chat_messages:', err.message)
                }
              }
            }

            // Estados de mensajes enviados
            if (value.statuses && value.statuses.length > 0) {
              for (const status of value.statuses) {
                console.log('📊 Estado de mensaje Meta:', {
                  id: status.id,
                  estado: status.status,
                  destinatario: status.recipient_id,
                  timestamp: new Date(parseInt(status.timestamp) * 1000).toISOString()
                })

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
                  console.log(`✅ Estado actualizado para mensaje ${status.id}: ${dbStatus}`)
                } catch (err: any) {
                  console.error('❌ Error actualizando estado de mensaje:', err.message)
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
