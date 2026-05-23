import { db } from "../../../config/database.js";
import { metaTemplates } from "../../../infrastructure/database/schema/meta-templates.js";
import { whatsappSessions } from "../../../infrastructure/database/schema/whatsapp-sessions.js";
import { decrypt } from "../../../infrastructure/security/encryption.service.js";
import { eq, and } from "drizzle-orm";

export class MetaTemplateService {
  async syncTemplates(userId: string, sessionId: string): Promise<{ synced: number }> {
    const [session] = await db
      .select()
      .from(whatsappSessions)
      .where(and(eq(whatsappSessions.id, sessionId), eq(whatsappSessions.userId, userId)))
      .limit(1);

    if (!session || session.connectionType !== "meta_cloud") {
      throw new Error("Meta Cloud session not found");
    }

    if (!session.metaAccessToken || !session.wabaId) {
      throw new Error("Session missing access token or WABA ID");
    }

    const accessToken = decrypt(session.metaAccessToken);
    const wabaId = session.wabaId;

    const allTemplates: any[] = [];
    let url: string | null = `https://graph.facebook.com/v21.0/${wabaId}/message_templates?fields=id,name,status,category,language,components&limit=100`;

    while (url) {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const err: any = await response.json();
        throw new Error(err.error?.message || "Failed to fetch templates from Meta");
      }

      const data: any = await response.json();
      allTemplates.push(...(data.data || []));
      url = data.paging?.next || null;
    }

    let synced = 0;

    for (const tpl of allTemplates) {
      const existing = await db
        .select({ id: metaTemplates.id })
        .from(metaTemplates)
        .where(
          and(
            eq(metaTemplates.wabaId, wabaId),
            eq(metaTemplates.metaTemplateId, tpl.id),
            eq(metaTemplates.language, tpl.language)
          )
        )
        .limit(1);

      if (existing.length > 0) {
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
          .where(eq(metaTemplates.id, existing[0].id));
      } else {
        await db.insert(metaTemplates).values({
          userId,
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
        .where(and(eq(metaTemplates.userId, userId), eq(metaTemplates.wabaId, wabaId)));

      for (const local of localTemplates) {
        if (!metaIds.includes(local.metaTemplateId)) {
          await db.delete(metaTemplates).where(eq(metaTemplates.id, local.id));
        }
      }
    }

    return { synced };
  }

  async listTemplates(userId: string, sessionId: string) {
    const [session] = await db
      .select({ wabaId: whatsappSessions.wabaId })
      .from(whatsappSessions)
      .where(and(eq(whatsappSessions.id, sessionId), eq(whatsappSessions.userId, userId)))
      .limit(1);

    if (!session?.wabaId) {
      throw new Error("Session not found or missing WABA ID");
    }

    return db
      .select()
      .from(metaTemplates)
      .where(
        and(
          eq(metaTemplates.userId, userId),
          eq(metaTemplates.wabaId, session.wabaId),
          eq(metaTemplates.status, "APPROVED")
        )
      );
  }
}
