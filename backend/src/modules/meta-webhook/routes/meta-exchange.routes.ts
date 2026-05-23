import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { env } from '../../../config/env.js'
import { authGuard } from '../../../shared/middleware/auth.middleware.js'
import { db } from '../../../config/database.js'
import { whatsappSessions } from '../../../infrastructure/database/schema/whatsapp-sessions.js'
import { eq, and } from 'drizzle-orm'
import { encrypt } from '../../../infrastructure/security/encryption.service.js'

export async function metaExchangeRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", authGuard);

  fastify.post('/api/meta/exchange-token', async (
    request: FastifyRequest<{ 
      Body: { code: string; waba_id: string; phone_number_id: string } 
    }>,
    reply: FastifyReply
  ) => {
    const { code, waba_id, phone_number_id } = request.body
    const userId = (request as any).user.id

    try {
      // 1. Intercambiar código por token de acceso
      const tokenResponse = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?` +
        `client_id=${env.META_APP_ID}&` +
        `client_secret=${env.META_APP_SECRET}&` +
        `code=${code}`,
        { method: 'GET' }
      )

      const tokenData = await tokenResponse.json() as any

      if (!tokenData.access_token) {
        return reply.status(400).send({ error: 'No se pudo obtener el token de acceso' })
      }

      const accessToken = tokenData.access_token

      fastify.log.info({ waba_id, phone_number_id }, 'Token obtained via Embedded Signup')

      // 2. Consultar la API de Meta para obtener datos actualizados de la WABA
      let wabaDisplayPhone = ''
      let businessId = ''
      try {
        const wabaResponse = await fetch(
          `https://graph.facebook.com/v21.0/${waba_id}?fields=name,display_phone_number,phone_number_id,business_verification_status`,
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        )
        const wabaData = await wabaResponse.json() as any
        wabaDisplayPhone = wabaData.display_phone_number || ''
        businessId = wabaData.id || waba_id
      } catch (err) {
        fastify.log.warn('Could not fetch additional WABA data')
        businessId = waba_id
      }

      // 3. Guardar o actualizar sesión en BD
      const existingSession = await db
        .select()
        .from(whatsappSessions)
        .where(
          and(
            eq(whatsappSessions.userId, userId),
            eq(whatsappSessions.wabaId, waba_id)
          )
        )
        .limit(1)

      // Encriptar token antes de guardarlo en BD
      const encryptedToken = encrypt(accessToken)

      let session
      if (existingSession.length > 0) {
        // Actualizar sesión existente
        [session] = await db
          .update(whatsappSessions)
          .set({
            connectionType: 'meta_cloud',
            metaPhoneNumberId: phone_number_id,
            metaAccessToken: encryptedToken,
            metaBusinessId: businessId,
            phone: wabaDisplayPhone || phone_number_id,
            status: 'connected',
            lastConnectedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(whatsappSessions.id, existingSession[0].id))
          .returning()
      } else {
        // Crear nueva sesión
        [session] = await db
          .insert(whatsappSessions)
          .values({
            userId,
            name: `Meta-${wabaDisplayPhone || phone_number_id}`,
            connectionType: 'meta_cloud',
            wabaId: waba_id,
            metaPhoneNumberId: phone_number_id,
            metaAccessToken: encryptedToken,
            metaBusinessId: businessId,
            phone: wabaDisplayPhone || phone_number_id,
            status: 'connected',
            lastConnectedAt: new Date(),
          })
          .returning()
      }

      fastify.log.info({ sessionId: session.id }, 'Meta Cloud session saved')

      return reply.status(200).send({
        success: true,
        sessionId: session.id,
        waba_id,
        phone_number_id,
        phone: wabaDisplayPhone || phone_number_id,
      })

    } catch (error) {
      fastify.log.error('Error exchanging Meta token')
      return reply.status(500).send({ error: 'Error interno al conectar con Meta' })
    }
  })
}
