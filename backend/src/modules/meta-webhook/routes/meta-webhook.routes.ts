import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { env } from '../../../config/env.js'

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

            // Mensajes entrantes
            if (value.messages && value.messages.length > 0) {
              for (const message of value.messages) {
                const contactName = value.contacts?.[0]?.profile?.name || 'Desconocido'
                console.log('📩 Mensaje entrante Meta:', {
                  de: message.from,
                  nombre: contactName,
                  tipo: message.type,
                  texto: message.text?.body,
                  phoneNumberId,
                  timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString()
                })
                // TODO: conectar con lógica de chat/CRM aquí
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
                // TODO: actualizar estado en BD aquí
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
