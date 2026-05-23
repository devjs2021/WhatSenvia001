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

      // 2. Obtener el número de teléfono real desde el phone_number_id
      let displayPhone = ''
      let businessId = waba_id
      try {
        if (phone_number_id) {
          const phoneRes = await fetch(
            `https://graph.facebook.com/v21.0/${phone_number_id}?fields=display_phone_number,verified_name`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          )
          const phoneData = await phoneRes.json() as any
          displayPhone = phoneData.display_phone_number || ''
        }
      } catch (err) {
        fastify.log.warn('Could not fetch phone number data from Meta')
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
            phone: displayPhone || phone_number_id,
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
            name: `Meta-${displayPhone || phone_number_id}`,
            connectionType: 'meta_cloud',
            wabaId: waba_id,
            metaPhoneNumberId: phone_number_id,
            metaAccessToken: encryptedToken,
            metaBusinessId: businessId,
            phone: displayPhone || phone_number_id,
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
        phone: displayPhone || phone_number_id,
      })

    } catch (error) {
      fastify.log.error('Error exchanging Meta token')
      return reply.status(500).send({ error: 'Error interno al conectar con Meta' })
    }
  })
}
