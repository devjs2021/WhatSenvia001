import { db } from "../../config/database.js";
import { whatsappSessions } from "../database/schema/whatsapp-sessions.js";
import { eq, and, lt, isNotNull } from "drizzle-orm";
import { encrypt, decrypt } from "../security/encryption.service.js";
import { logger } from "../../config/logger.js";

const REFRESH_INTERVAL = 6 * 60 * 60 * 1000; // Check every 6 hours
const REFRESH_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // Refresh if expiring within 7 days

export function startTokenRefreshJob() {
  setInterval(async () => {
    try {
      await refreshExpiringTokens();
    } catch (err: any) {
      logger.error({ error: err.message }, "Token refresh job failed");
    }
  }, REFRESH_INTERVAL);

  // Run once on startup after a short delay
  setTimeout(() => refreshExpiringTokens().catch(() => {}), 30000);
}

async function refreshExpiringTokens() {
  const threshold = new Date(Date.now() + REFRESH_THRESHOLD);

  const expiringSessions = await db
    .select()
    .from(whatsappSessions)
    .where(
      and(
        eq(whatsappSessions.connectionType, "meta_cloud"),
        eq(whatsappSessions.status, "connected"),
        isNotNull(whatsappSessions.metaAccessToken),
        isNotNull(whatsappSessions.metaTokenExpiresAt),
        lt(whatsappSessions.metaTokenExpiresAt, threshold)
      )
    );

  if (expiringSessions.length === 0) return;

  logger.info(`Found ${expiringSessions.length} Meta token(s) expiring soon, attempting refresh`);

  for (const session of expiringSessions) {
    try {
      const currentToken = decrypt(session.metaAccessToken!);

      const res = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?` +
        `grant_type=fb_exchange_token&` +
        `client_id=${process.env.META_APP_ID}&` +
        `client_secret=${process.env.META_APP_SECRET}&` +
        `fb_exchange_token=${currentToken}`
      );

      const data = await res.json() as any;

      if (data.access_token) {
        const expiresIn = data.expires_in || 5184000;
        const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

        await db
          .update(whatsappSessions)
          .set({
            metaAccessToken: encrypt(data.access_token),
            metaTokenExpiresAt: newExpiresAt,
            updatedAt: new Date(),
          })
          .where(eq(whatsappSessions.id, session.id));

        logger.info(
          { sessionId: session.id, expiresAt: newExpiresAt.toISOString() },
          "Meta token refreshed"
        );
      } else {
        logger.warn(
          { sessionId: session.id, error: data.error?.message },
          "Meta token refresh failed — user may need to re-authenticate"
        );
      }
    } catch (err: any) {
      logger.error(
        { sessionId: session.id, error: err.message },
        "Meta token refresh error"
      );
    }
  }
}
