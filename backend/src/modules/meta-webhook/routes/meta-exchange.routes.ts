import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { env } from '../../../config/env.js'

export async function metaExchangeRoutes(fastify: FastifyInstance) {
  fastify.post('/api/meta/exchange-token', async (
    request: FastifyRequest<{ 
      Body: { code: string; waba_id: string; phone_number_id: string } 
    }>,
    reply: FastifyReply
  ) => {
    const { code, waba_id, phone_number_id } = request.body

    try {
      // Intercambiar código por token
      const response = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?` +
        `client_id=${env.META_APP_ID}&` +
        `client_secret=${env.META_APP_SECRET}&` +
        `code=${code}`,
        { method: 'GET' }
      )

      const data = await response.json() as any

      if (data.access_token) {
        console.log('✅ Cliente conectado via Embedded Signup:', {
          waba_id,
          phone_number_id,
          token_type: data.token_type
        })

        // TODO: guardar en BD - waba_id, phone_number_id, access_token
        return reply.status(200).send({
          success: true,
          waba_id,
          phone_number_id
        })
      }

      return reply.status(400).send({ error: 'No se pudo obtener el token' })

    } catch (error) {
      console.error('❌ Error intercambiando token:', error)
      return reply.status(500).send({ error: 'Error interno' })
    }
  })
}
