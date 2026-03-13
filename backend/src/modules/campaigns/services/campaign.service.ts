import { db } from "../../../config/database.js";
import { campaigns } from "../../../infrastructure/database/schema/campaigns.js";
import { messages } from "../../../infrastructure/database/schema/messages.js";
import { eq, and, count, desc } from "drizzle-orm";
import { campaignQueue } from "../../../infrastructure/queue/campaign.queue.js";
import type { CreateCampaignInput, UpdateCampaignInput } from "../schemas/campaign.schema.js";

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
      })
      .returning();

    return campaign;
  }

  async update(userId: string, campaignId: string, input: UpdateCampaignInput) {
    const [campaign] = await db
      .update(campaigns)
      .set({ ...input, updatedAt: new Date() })
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
}
