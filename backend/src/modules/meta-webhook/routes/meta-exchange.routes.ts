import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { env } from '../../../config/env.js'
import { authGuard } from '../../../shared/middleware/auth.middleware.js'
import { db } from '../../../config/database.js'
import { whatsappSessions } from '../../../infrastructure/database/schema/whatsapp-sessions.js'
import { eq, and, count } from 'drizzle-orm'
import { encrypt, decrypt } from '../../../infrastructure/security/encryption.service.js'
import { licenseService } from '../../admin/services/license.service.js'
import crypto from 'crypto'

export async function metaExchangeRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", authGuard);

  fastify.post('/api/meta/exchange-token', async (
    request: FastifyRequest<{
      Body: { code: string; waba_id: string; phone_number_id: string; is_coexistence?: boolean }
    }>,
    reply: FastifyReply
  ) => {
    const { code, waba_id, is_coexistence } = request.body
    let phone_number_id = request.body.phone_number_id
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

      // Exchange short-lived token for long-lived token (~60 days)
      let accessToken = tokenData.access_token
      let tokenExpiresAt: Date | null = null

      try {
        const llRes = await fetch(
          `https://graph.facebook.com/v21.0/oauth/access_token?` +
          `grant_type=fb_exchange_token&` +
          `client_id=${env.META_APP_ID}&` +
          `client_secret=${env.META_APP_SECRET}&` +
          `fb_exchange_token=${accessToken}`
        )
        const llData = await llRes.json() as any
        if (llData.access_token) {
          accessToken = llData.access_token
          const expiresIn = llData.expires_in || 5184000 // default 60 days
          tokenExpiresAt = new Date(Date.now() + expiresIn * 1000)
          fastify.log.info({ expiresIn, expiresAt: tokenExpiresAt.toISOString() }, 'Exchanged for long-lived token')
        }
      } catch (err: any) {
        fastify.log.warn({ error: err.message }, 'Long-lived token exchange failed, using short-lived token')
      }

      fastify.log.info({ waba_id, phone_number_id, is_coexistence }, 'Token obtained via Embedded Signup')

      // Coexistence: the finish event only returns waba_id (the number was already
      // registered in the WhatsApp Business app), so resolve phone_number_id here.
      if (is_coexistence && !phone_number_id && waba_id) {
        try {
          const numbersRes = await fetch(
            `https://graph.facebook.com/v21.0/${waba_id}/phone_numbers?fields=id,is_on_biz_app`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          )
          const numbersData = await numbersRes.json() as any
          const numbers = numbersData.data || []
          const bizAppNumber = numbers.find((n: any) => n.is_on_biz_app) || numbers[0]
          if (bizAppNumber?.id) {
            phone_number_id = bizAppNumber.id
            fastify.log.info({ waba_id, phone_number_id }, 'Resolved phone_number_id for coexistence onboarding')
          }
        } catch (err: any) {
          fastify.log.warn({ error: err.message }, 'Could not resolve phone_number_id for coexistence onboarding')
        }
      }

      if (is_coexistence && !phone_number_id) {
        return reply.status(400).send({ error: 'No se pudo obtener el número de teléfono de la cuenta de WhatsApp Business' })
      }

      // 2. Obtener el número de teléfono real desde el phone_number_id
      let displayPhone = ''
      let businessId = waba_id
      if (phone_number_id) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const phoneRes = await fetch(
              `https://graph.facebook.com/v21.0/${phone_number_id}?fields=display_phone_number,verified_name`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            )
            const phoneData = await phoneRes.json() as any
            if (phoneData.display_phone_number) {
              displayPhone = phoneData.display_phone_number
              break
            }
            if (attempt === 0) await new Promise(r => setTimeout(r, 1000))
          } catch (err) {
            fastify.log.warn(`Could not fetch phone number data from Meta (attempt ${attempt + 1})`)
          }
        }
      }

      // 3. Guardar o actualizar sesión en BD
      // Lookup by phone_number_id so each number is an independent session.
      // Using wabaId would overwrite existing sessions when the same WABA adds a second number.
      const existingSession = await db
        .select()
        .from(whatsappSessions)
        .where(
          and(
            eq(whatsappSessions.userId, userId),
            eq(whatsappSessions.metaPhoneNumberId, phone_number_id)
          )
        )
        .limit(1)

      // Enforce maxSessions only when creating a new session (not updating existing)
      if (existingSession.length === 0) {
        const license = await licenseService.getActiveLicense(userId)
        if (license) {
          const [{ total }] = await db
            .select({ total: count() })
            .from(whatsappSessions)
            .where(eq(whatsappSessions.userId, userId))

          if (total >= license.maxSessions) {
            return reply.status(403).send({
              error: `Límite de sesiones alcanzado (máx. ${license.maxSessions}). Contacta al administrador para ampliar tu plan.`
            })
          }
        }
      }

      // Encriptar token antes de guardarlo en BD
      const encryptedToken = encrypt(accessToken)

      let session
      if (existingSession.length > 0) {
        [session] = await db
          .update(whatsappSessions)
          .set({
            connectionType: 'meta_cloud',
            metaPhoneNumberId: phone_number_id,
            metaAccessToken: encryptedToken,
            metaBusinessId: businessId,
            metaTokenExpiresAt: tokenExpiresAt,
            phone: displayPhone || phone_number_id,
            status: 'connected',
            isCoexistence: !!is_coexistence,
            historySyncStatus: is_coexistence ? 'requested' : existingSession[0].historySyncStatus,
            lastConnectedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(whatsappSessions.id, existingSession[0].id))
          .returning()
      } else {
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
            metaTokenExpiresAt: tokenExpiresAt,
            phone: displayPhone || phone_number_id,
            status: 'connected',
            isCoexistence: !!is_coexistence,
            historySyncStatus: is_coexistence ? 'requested' : undefined,
            lastConnectedAt: new Date(),
          })
          .returning()
      }

      fastify.log.info({ sessionId: session.id }, 'Meta Cloud session saved')

      // 4. Auto-register phone number with Meta so it's ready to send/receive
      // Skipped for coexistence: the number is already registered via the WhatsApp Business app.
      let registered = is_coexistence ? true : false
      const pin = crypto.randomInt(100000, 999999).toString()
      try {
        if (phone_number_id && !is_coexistence) {
          const regRes = await fetch(
            `https://graph.facebook.com/v21.0/${phone_number_id}/register`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ messaging_product: 'whatsapp', pin }),
            }
          )
          const regData = await regRes.json() as any
          registered = regRes.ok && regData.success === true
          if (registered) {
            fastify.log.info({ phone_number_id }, 'Phone number registered with Meta')
          } else {
            fastify.log.warn({ phone_number_id, error: regData.error }, 'Phone registration response')
          }
        }
      } catch (err: any) {
        fastify.log.warn({ error: err.message }, 'Phone auto-registration failed (non-blocking)')
      }

      // 5. Auto-subscribe app to WABA webhook so incoming messages arrive
      let subscribed = false
      try {
        if (waba_id) {
          const subRes = await fetch(
            `https://graph.facebook.com/v21.0/${waba_id}/subscribed_apps`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          )
          const subData = await subRes.json() as any
          subscribed = subRes.ok && subData.success === true
          if (subscribed) {
            fastify.log.info({ waba_id }, 'App subscribed to WABA webhook')
          } else {
            fastify.log.warn({ waba_id, error: subData.error }, 'WABA webhook subscription response')
          }
        }
      } catch (err: any) {
        fastify.log.warn({ error: err.message }, 'WABA webhook subscription failed (non-blocking)')
      }

      // 6. Coexistence: trigger the one-time sync of message history + contacts.
      // Must happen within 24h of onboarding, so we fire it right away (non-blocking).
      // Meta responds with history/smb_app_state_sync webhooks asynchronously.
      let historySyncRequested = false
      if (is_coexistence && phone_number_id) {
        try {
          const syncRes = await fetch(
            `https://graph.facebook.com/v21.0/${phone_number_id}/smb_app_data`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ messaging_product: 'whatsapp', sync_type: 'history' }),
            }
          )
          const syncData = await syncRes.json() as any
          historySyncRequested = syncRes.ok
          if (historySyncRequested) {
            fastify.log.info({ phone_number_id, requestId: syncData.request_id }, 'Coexistence history sync requested')
          } else {
            fastify.log.warn({ phone_number_id, error: syncData.error }, 'Coexistence history sync request failed')
            await db.update(whatsappSessions).set({ historySyncStatus: 'failed' }).where(eq(whatsappSessions.id, session.id))
          }
        } catch (err: any) {
          fastify.log.warn({ error: err.message }, 'Coexistence history sync request failed (non-blocking)')
          await db.update(whatsappSessions).set({ historySyncStatus: 'failed' }).where(eq(whatsappSessions.id, session.id))
        }
      }

      return reply.status(200).send({
        success: true,
        sessionId: session.id,
        waba_id,
        phone_number_id,
        phone: displayPhone || phone_number_id,
        registered,
        subscribed,
        isCoexistence: !!is_coexistence,
        historySyncRequested,
      })

    } catch (error) {
      fastify.log.error('Error exchanging Meta token')
      return reply.status(500).send({ error: 'Error interno al conectar con Meta' })
    }
  })

  // Register phone number with Meta Cloud API
  fastify.post('/api/meta/register-phone', async (
    request: FastifyRequest<{ Body: { sessionId: string; pin: string } }>,
    reply: FastifyReply
  ) => {
    const userId = (request as any).user.id
    const { sessionId, pin } = request.body

    if (!sessionId || !pin) {
      return reply.status(400).send({ error: 'sessionId and pin are required' })
    }

    const [session] = await db
      .select()
      .from(whatsappSessions)
      .where(and(eq(whatsappSessions.id, sessionId), eq(whatsappSessions.userId, userId)))
      .limit(1)

    if (!session || session.connectionType !== 'meta_cloud') {
      return reply.status(404).send({ error: 'Meta Cloud session not found' })
    }

    if (!session.metaAccessToken || !session.metaPhoneNumberId) {
      return reply.status(400).send({ error: 'Session missing access token or phone number ID' })
    }

    try {
      const accessToken = decrypt(session.metaAccessToken)
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${session.metaPhoneNumberId}/register`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messaging_product: 'whatsapp', pin }),
        }
      )
      const data = await res.json()
      return reply.status(res.ok ? 200 : res.status).send(data)
    } catch (err: any) {
      return reply.status(500).send({ error: err.message })
    }
  })

  // Get phone number status from Meta Graph API
  fastify.get('/api/meta/phone-status', async (
    request: FastifyRequest<{ Querystring: { sessionId: string } }>,
    reply: FastifyReply
  ) => {
    const userId = (request as any).user.id
    const { sessionId } = request.query

    if (!sessionId) {
      return reply.status(400).send({ error: 'sessionId query param is required' })
    }

    const [session] = await db
      .select()
      .from(whatsappSessions)
      .where(and(eq(whatsappSessions.id, sessionId), eq(whatsappSessions.userId, userId)))
      .limit(1)

    if (!session || session.connectionType !== 'meta_cloud') {
      return reply.status(404).send({ error: 'Meta Cloud session not found' })
    }

    if (!session.metaAccessToken || !session.metaPhoneNumberId) {
      return reply.status(400).send({ error: 'Session missing access token or phone number ID' })
    }

    try {
      const accessToken = decrypt(session.metaAccessToken)
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${session.metaPhoneNumberId}?fields=display_phone_number,verified_name,code_verification_status,quality_rating,status,name_status`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const data = await res.json()
      return reply.status(res.ok ? 200 : res.status).send(data)
    } catch (err: any) {
      return reply.status(500).send({ error: err.message })
    }
  })

  // Subscribe app to webhook for a phone number (diagnostic endpoint)
  fastify.get('/api/meta/subscribe-webhook', async (
    request: FastifyRequest<{ Querystring: { sessionId?: string } }>,
    reply: FastifyReply
  ) => {
    const userId = (request as any).user.id
    const { sessionId: qsSessionId } = request.query

    // Find the meta_cloud session
    const conditions = [eq(whatsappSessions.userId, userId)]
    if (qsSessionId) {
      conditions.push(eq(whatsappSessions.id, qsSessionId))
    }
    const [session] = await db
      .select()
      .from(whatsappSessions)
      .where(and(...conditions, eq(whatsappSessions.connectionType, 'meta_cloud')))
      .limit(1)

    if (!session?.metaAccessToken || !session?.wabaId) {
      return reply.status(404).send({ error: 'No Meta Cloud session found' })
    }

    const accessToken = decrypt(session.metaAccessToken)
    const wabaId = session.wabaId
    const phoneNumberId = session.metaPhoneNumberId

    try {
      // 1. Check current subscriptions on WABA
      const checkRes = await fetch(
        `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const checkData = await checkRes.json()

      // 2. Subscribe the app to the WABA
      const subRes = await fetch(
        `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )
      const subData = await subRes.json()

      // 3. Also check phone number webhook fields
      let phoneFields = null
      if (phoneNumberId) {
        const phoneRes = await fetch(
          `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=display_phone_number,verified_name,code_verification_status,quality_rating,status,is_official_business_account`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        phoneFields = await phoneRes.json()
      }

      return reply.send({
        wabaId,
        phoneNumberId,
        currentSubscriptions: checkData,
        subscribeResult: subData,
        phoneStatus: phoneFields,
      })
    } catch (err: any) {
      return reply.status(500).send({ error: err.message })
    }
  })
}
