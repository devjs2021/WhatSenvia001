import { db } from "../../../config/database.js";
import { campaigns } from "../../../infrastructure/database/schema/campaigns.js";
import { metaTemplates } from "../../../infrastructure/database/schema/meta-templates.js";
import { messages } from "../../../infrastructure/database/schema/messages.js";
import { eq, and, count, desc, inArray, getTableColumns } from "drizzle-orm";
import { campaignQueue } from "../../../infrastructure/queue/campaign.queue.js";
import { messageQueue } from "../../../infrastructure/queue/message.queue.js";
import { MetaTemplateService } from "../../meta-templates/services/meta-template.service.js";
import type { CreateCampaignInput, UpdateCampaignInput, CreateUnifiedCampaignInput } from "../schemas/campaign.schema.js";
import { buildCampaignReportWorkbook } from "./campaign-report.service.js";
import { logger } from "../../../config/logger.js";

export class CampaignService {
  async list(userId: string, page: number, limit: number, status?: string) {
    const offset = (page - 1) * limit;
    const conditions = [eq(campaigns.userId, userId)];

    if (status) {
      conditions.push(eq(campaigns.status, status as any));
    }

    const where = and(...conditions);

    const [data, [{ total }]] = await Promise.all([
      db.select().from(campaigns).where(where).orderBy(desc(campaigns.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(campaigns).where(where),
    ]);

    return { data, total };
  }

  async getById(userId: string, campaignId: string) {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
      .limit(1);

    return campaign || null;
  }

  async create(userId: string, input: CreateCampaignInput) {
    const [campaign] = await db
      .insert(campaigns)
      .values({
        userId,
        sessionId: input.sessionId,
        name: input.name,
        description: input.description,
        message: input.message,
        mediaUrl: input.mediaUrl,
        mediaType: input.mediaType,
        targetTags: input.targetTags,
        messagesPerMinute: input.messagesPerMinute,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        isTemplateCampaign: input.isTemplateCampaign ?? false,
        metaTemplateId: input.metaTemplateId,
        templateParams: input.templateParams,
      })
      .returning();

    return campaign;
  }

  async update(userId: string, campaignId: string, input: UpdateCampaignInput) {
    const [campaign] = await db
      .update(campaigns)
      .set({ ...input, scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined, updatedAt: new Date() })
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
      .returning();

    return campaign || null;
  }

  async delete(userId: string, campaignId: string) {
    const [deleted] = await db
      .delete(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
      .returning({ id: campaigns.id });

    return !!deleted;
  }

  async start(userId: string, campaignId: string) {
    const campaign = await this.getById(userId, campaignId);
    if (!campaign) throw new Error("Campaign not found");
    if (!campaign.sessionId) throw new Error("No WhatsApp session assigned");
    if (campaign.status !== "draft" && campaign.status !== "paused") {
      throw new Error(`Cannot start campaign with status: ${campaign.status}`);
    }

    await campaignQueue.add(`campaign-${campaignId}`, {
      campaignId,
      userId,
      sessionId: campaign.sessionId,
      messagesPerMinute: campaign.messagesPerMinute,
    });

    await db
      .update(campaigns)
      .set({ status: "scheduled" })
      .where(eq(campaigns.id, campaignId));

    return { status: "scheduled" };
  }

  async pause(userId: string, campaignId: string) {
    const [campaign] = await db
      .update(campaigns)
      .set({ status: "paused", updatedAt: new Date() })
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
      .returning();

    return campaign || null;
  }

  /**
   * Cancela un envío en curso de verdad: saca de la cola los mensajes que
   * todavía no se han empezado a procesar (a diferencia de pause(), que solo
   * cambia el estado en pantalla pero deja la cola intacta). Los mensajes que
   * ya están "activos" en ese instante no se pueden cancelar de forma segura
   * a mitad de camino — se dejan terminar y quedan reflejados normalmente.
   */
  async cancel(userId: string, campaignId: string) {
    const campaign = await this.getById(userId, campaignId);
    if (!campaign) return null;
    if (!["running", "scheduled", "paused"].includes(campaign.status)) {
      throw new Error(`No se puede cancelar una campaña con estado: ${campaign.status}`);
    }

    // "prioritized" es un estado aparte de BullMQ para jobs con `priority`
    // (los mensajes de campaña se encolan con priority: 2) — sin incluirlo
    // aquí, cancelar nunca los encuentra y no hace nada de verdad.
    const pendingJobs = await messageQueue.getJobs(["waiting", "delayed", "prioritized"]);
    let removed = 0;
    for (const job of pendingJobs) {
      if (job.data.campaignId !== campaignId) continue;
      try {
        await job.remove();
        removed++;
      } catch (err: any) {
        logger.warn({ jobId: job.id, error: err.message }, "No se pudo remover el job de la cola al cancelar");
      }
    }

    await db
      .update(messages)
      .set({ status: "cancelled" })
      .where(and(eq(messages.campaignId, campaignId), inArray(messages.status, ["queued"])));

    const [updated] = await db
      .update(campaigns)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
      .returning();

    logger.info({ campaignId, removed }, "Campaign cancelled");
    return updated;
  }

  /**
   * Botón de emergencia: cancela TODO lo pendiente del usuario, incluyendo
   * mensajes cuya campaña original ya no existe (por ejemplo, se borró en
   * cascada al eliminar la sesión de WhatsApp a la que apuntaban). cancel()
   * necesita que la campaña siga existiendo para autorizar/acotar la
   * cancelación — esto no, revisa la propiedad mensaje por mensaje.
   */
  async cancelAllPending(userId: string) {
    // "prioritized" es un estado aparte de BullMQ para jobs con `priority`
    // (los mensajes de campaña se encolan con priority: 2) — sin incluirlo
    // aquí, cancelar nunca los encuentra y no hace nada de verdad.
    const pendingJobs = await messageQueue.getJobs(["waiting", "delayed", "prioritized"]);
    const cancelledMessageIds: string[] = [];

    for (const job of pendingJobs) {
      const messageId = job.data.messageId;
      if (!messageId) continue;

      const [msg] = await db
        .select({ userId: messages.userId })
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (!msg || msg.userId !== userId) continue;

      try {
        await job.remove();
        cancelledMessageIds.push(messageId);
      } catch (err: any) {
        logger.warn({ jobId: job.id, error: err.message }, "No se pudo remover el job al cancelar todo lo pendiente");
      }
    }

    if (cancelledMessageIds.length > 0) {
      await db
        .update(messages)
        .set({ status: "cancelled" })
        .where(and(inArray(messages.id, cancelledMessageIds), inArray(messages.status, ["queued"])));
    }

    await db
      .update(campaigns)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(campaigns.userId, userId), inArray(campaigns.status, ["running", "scheduled", "paused"])));

    logger.info({ userId, removed: cancelledMessageIds.length }, "Cancelled all pending messages for user");
    return { removed: cancelledMessageIds.length };
  }

  async createUnified(userId: string, input: CreateUnifiedCampaignInput) {
    const metaTemplateService = new MetaTemplateService();
    const { template } = await metaTemplateService.createTemplate(userId, input.sessionId, {
      name: input.templateName,
      category: input.templateCategory,
      language: input.templateLanguage,
      components: input.templateComponents,
    });

    const [campaign] = await db
      .insert(campaigns)
      .values({
        userId,
        sessionId: input.sessionId,
        name: input.name,
        message: `[Template: ${input.templateName}]`,
        status: "pending_approval",
        isTemplateCampaign: true,
        metaTemplateId: template.id,
        templateParams: input.templateParams || {},
        templateName: input.templateName,
        contacts: input.contacts,
        totalContacts: input.contacts.length,
        messagesPerMinute: input.messagesPerMinute,
      })
      .returning();

    return { campaign, template };
  }

  async sendApproved(userId: string, campaignId: string) {
    const campaign = await this.getById(userId, campaignId);
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.status !== "pending_approval") throw new Error("Campaign is not pending approval");
    if (!campaign.metaTemplateId) throw new Error("Campaign has no template");
    if (!campaign.sessionId) throw new Error("No session assigned");

    const [template] = await db
      .select()
      .from(metaTemplates)
      .where(eq(metaTemplates.id, campaign.metaTemplateId))
      .limit(1);

    if (!template || template.status !== "APPROVED") {
      throw new Error("Template is not yet approved by Meta");
    }

    await campaignQueue.add(`campaign-${campaignId}`, {
      campaignId,
      userId,
      sessionId: campaign.sessionId,
      messagesPerMinute: campaign.messagesPerMinute,
    });

    await db
      .update(campaigns)
      .set({ status: "scheduled", updatedAt: new Date() })
      .where(eq(campaigns.id, campaignId));

    return { status: "scheduled" };
  }

  async listUnified(userId: string) {
    const result = await db
      .select({
        ...getTableColumns(campaigns),
        templateStatus: metaTemplates.status,
        templateComponents: metaTemplates.components,
      })
      .from(campaigns)
      .leftJoin(metaTemplates, eq(campaigns.metaTemplateId, metaTemplates.id))
      .where(
        and(
          eq(campaigns.userId, userId),
          eq(campaigns.isTemplateCampaign, true),
        )
      )
      .orderBy(desc(campaigns.createdAt));

    return result;
  }

  async getStats(userId: string, campaignId: string) {
    const campaign = await this.getById(userId, campaignId);
    if (!campaign) return null;

    return {
      totalContacts: campaign.totalContacts,
      sent: campaign.sentCount,
      delivered: campaign.deliveredCount,
      failed: campaign.failedCount,
      pending: campaign.totalContacts - campaign.sentCount - campaign.failedCount,
      progress:
        campaign.totalContacts > 0
          ? Math.round((campaign.sentCount / campaign.totalContacts) * 100)
          : 0,
    };
  }

  /** Reporte descargable (.xlsx) de una campaña: resumen + detalle por destinatario. */
  async generateReport(userId: string, campaignId: string) {
    const campaign = await this.getById(userId, campaignId);
    if (!campaign) return null;

    const rows = await db
      .select({
        phone: messages.phone,
        status: messages.status,
        errorMessage: messages.errorMessage,
        estimatedCost: messages.estimatedCost,
        sentAt: messages.sentAt,
        deliveredAt: messages.deliveredAt,
      })
      .from(messages)
      .where(eq(messages.campaignId, campaignId))
      .orderBy(messages.createdAt);

    const buffer = buildCampaignReportWorkbook(campaign, rows);
    return { campaign, buffer };
  }
}
