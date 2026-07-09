import { db } from "../../../config/database.js";
import { campaigns } from "../../../infrastructure/database/schema/campaigns.js";
import { metaTemplates } from "../../../infrastructure/database/schema/meta-templates.js";
import { messages } from "../../../infrastructure/database/schema/messages.js";
import { eq, and, count, desc, getTableColumns } from "drizzle-orm";
import { campaignQueue } from "../../../infrastructure/queue/campaign.queue.js";
import { MetaTemplateService } from "../../meta-templates/services/meta-template.service.js";
import type { CreateCampaignInput, UpdateCampaignInput, CreateUnifiedCampaignInput } from "../schemas/campaign.schema.js";
import { buildCampaignReportWorkbook } from "./campaign-report.service.js";

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
