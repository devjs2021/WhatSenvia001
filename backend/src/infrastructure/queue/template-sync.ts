import { logger } from "../../config/logger.js";
import { db } from "../../config/database.js";
import { whatsappSessions } from "../database/schema/whatsapp-sessions.js";
import { metaTemplates } from "../database/schema/meta-templates.js";
import { decrypt } from "../security/encryption.service.js";
import { eq, and } from "drizzle-orm";

async function syncAllMetaTemplates() {
  try {
    const metaSessions = await db
      .select({
        id: whatsappSessions.id,
        userId: whatsappSessions.userId,
        wabaId: whatsappSessions.wabaId,
        metaAccessToken: whatsappSessions.metaAccessToken,
      })
      .from(whatsappSessions)
      .where(
        and(
          eq(whatsappSessions.connectionType, "meta_cloud"),
          eq(whatsappSessions.status, "connected"),
        )
      );

    if (metaSessions.length === 0) return;

    for (const session of metaSessions) {
      if (!session.metaAccessToken || !session.wabaId) continue;

      try {
        const accessToken = decrypt(session.metaAccessToken);
        const wabaId = session.wabaId;

        const allTemplates: any[] = [];
        let url: string | null = `https://graph.facebook.com/v21.0/${wabaId}/message_templates?fields=id,name,status,category,language,components&limit=100`;

        while (url) {
          const response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!response.ok) break;

          const data: any = await response.json();
          allTemplates.push(...(data.data || []));
          url = data.paging?.next || null;
        }

        let synced = 0;

        for (const tpl of allTemplates) {
          const [existing] = await db
            .select({ id: metaTemplates.id })
            .from(metaTemplates)
            .where(
              and(
                eq(metaTemplates.wabaId, wabaId),
                eq(metaTemplates.metaTemplateId, tpl.id),
                eq(metaTemplates.language, tpl.language),
              )
            )
            .limit(1);

          if (existing) {
            await db
              .update(metaTemplates)
              .set({
                name: tpl.name,
                status: tpl.status,
                category: tpl.category,
                components: tpl.components || [],
                lastSyncedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(metaTemplates.id, existing.id));
          } else {
            await db.insert(metaTemplates).values({
              userId: session.userId,
              wabaId,
              metaTemplateId: tpl.id,
              name: tpl.name,
              status: tpl.status,
              category: tpl.category,
              language: tpl.language,
              components: tpl.components || [],
              lastSyncedAt: new Date(),
            });
          }
          synced++;
        }

        // Remove templates that no longer exist on Meta
        const metaIds = allTemplates.map((t) => t.id);
        if (metaIds.length > 0) {
          const localTemplates = await db
            .select({ id: metaTemplates.id, metaTemplateId: metaTemplates.metaTemplateId })
            .from(metaTemplates)
            .where(and(eq(metaTemplates.userId, session.userId), eq(metaTemplates.wabaId, wabaId)));

          for (const local of localTemplates) {
            if (!metaIds.includes(local.metaTemplateId)) {
              await db.delete(metaTemplates).where(eq(metaTemplates.id, local.id));
            }
          }
        }

        if (synced > 0) {
          logger.debug({ sessionId: session.id, synced }, "Auto-synced Meta templates");
        }
      } catch (err: any) {
        logger.warn({ sessionId: session.id, error: err.message }, "Failed to auto-sync templates for session");
      }
    }
  } catch (err: any) {
    logger.error({ error: err.message }, "Error in template auto-sync");
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startTemplateSyncJob() {
  syncAllMetaTemplates();
  intervalId = setInterval(syncAllMetaTemplates, 5 * 60_000);
  logger.info("Meta template auto-sync started (5min interval)");
}

export function stopTemplateSyncJob() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
