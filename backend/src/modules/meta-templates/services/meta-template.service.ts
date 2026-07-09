import { db } from "../../../config/database.js";
import { metaTemplates } from "../../../infrastructure/database/schema/meta-templates.js";
import { whatsappSessions } from "../../../infrastructure/database/schema/whatsapp-sessions.js";
import { decrypt } from "../../../infrastructure/security/encryption.service.js";
import { notifyTemplateStatusChange } from "./template-status-notifier.js";
import { eq, and } from "drizzle-orm";

interface CreateTemplateInput {
  name: string;
  category: string;
  language: string;
  components: any[];
}

export class MetaTemplateService {
  async createTemplate(userId: string, sessionId: string, input: CreateTemplateInput) {
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

    const metaPayload = {
      name: input.name,
      category: input.category,
      language: input.language,
      components: input.components,
    };

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${wabaId}/message_templates`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metaPayload),
      }
    );

    const metaResponse: any = await response.json();

    if (!response.ok) {
      const msg = metaResponse.error?.message || "Failed to create template on Meta";
      throw new Error(msg);
    }

    const [saved] = await db
      .insert(metaTemplates)
      .values({
        userId,
        wabaId,
        metaTemplateId: metaResponse.id,
        name: input.name,
        status: metaResponse.status || "PENDING",
        category: input.category,
        language: input.language,
        components: input.components,
        lastSyncedAt: new Date(),
      })
      .returning();

    return { template: saved, metaResponse };
  }

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
        .select({ id: metaTemplates.id, status: metaTemplates.status })
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

        await notifyTemplateStatusChange({
          templateId: existing[0].id,
          ownerId: userId,
          templateName: tpl.name,
          oldStatus: existing[0].status,
          newStatus: tpl.status,
        });
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
          eq(metaTemplates.wabaId, session.wabaId)
        )
      );
  }

  /**
   * Todas las plantillas del usuario, sin importar el número/WABA, con el o
   * los números de teléfono que pueden usarlas (una plantilla pertenece al
   * WABA, y un WABA puede tener más de un número conectado).
   */
  async listAllTemplates(userId: string) {
    const [templates, sessions] = await Promise.all([
      db.select().from(metaTemplates).where(eq(metaTemplates.userId, userId)),
      db
        .select({ wabaId: whatsappSessions.wabaId, phone: whatsappSessions.phone, name: whatsappSessions.name })
        .from(whatsappSessions)
        .where(and(eq(whatsappSessions.userId, userId), eq(whatsappSessions.connectionType, "meta_cloud"))),
    ]);

    const numbersByWaba = new Map<string, string[]>();
    for (const s of sessions) {
      if (!s.wabaId) continue;
      const label = s.phone || s.name;
      const list = numbersByWaba.get(s.wabaId) || [];
      list.push(label);
      numbersByWaba.set(s.wabaId, list);
    }

    return templates.map((t) => ({
      ...t,
      sessionNumbers: numbersByWaba.get(t.wabaId) || [],
    }));
  }
}
