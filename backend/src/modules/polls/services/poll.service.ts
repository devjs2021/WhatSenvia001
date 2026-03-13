import { db } from "../../../config/database.js";
import { pollCampaigns, pollResponses, pollSentMessages } from "../../../infrastructure/database/schema/polls.js";
import { eq, desc, sql } from "drizzle-orm";

export class PollService {
  // Create a poll campaign when user sends a poll
  async createPollCampaign(data: {
    userId: string;
    sessionId: string;
    question: string;
    options: string[];
    multiSelect: boolean;
    totalSent: number;
  }) {
    const [campaign] = await db
      .insert(pollCampaigns)
      .values(data)
      .returning();
    return campaign;
  }

  // Record a poll response (from Baileys poll update event)
  async recordResponse(data: {
    pollCampaignId: string;
    phone: string;
    selectedOptions: string[];
    whatsappMessageId?: string;
  }) {
    const [response] = await db
      .insert(pollResponses)
      .values(data)
      .returning();

    // Update total responses count
    await db
      .update(pollCampaigns)
      .set({
        totalResponses: sql`${pollCampaigns.totalResponses} + 1`,
      })
      .where(eq(pollCampaigns.id, data.pollCampaignId));

    return response;
  }

  // List all poll campaigns for a user
  async listCampaigns(userId: string) {
    const campaigns = await db
      .select()
      .from(pollCampaigns)
      .where(eq(pollCampaigns.userId, userId))
      .orderBy(desc(pollCampaigns.createdAt));
    return campaigns;
  }

  // Get poll campaign with aggregated results
  async getCampaignResults(campaignId: string) {
    const [campaign] = await db
      .select()
      .from(pollCampaigns)
      .where(eq(pollCampaigns.id, campaignId))
      .limit(1);

    if (!campaign) return null;

    // Get all responses
    const responses = await db
      .select()
      .from(pollResponses)
      .where(eq(pollResponses.pollCampaignId, campaignId))
      .orderBy(desc(pollResponses.respondedAt));

    // Aggregate: count per option
    const optionCounts: Record<string, number> = {};
    const optionPhones: Record<string, string[]> = {};

    for (const opt of campaign.options as string[]) {
      optionCounts[opt] = 0;
      optionPhones[opt] = [];
    }

    for (const resp of responses) {
      for (const selected of resp.selectedOptions as string[]) {
        if (optionCounts[selected] !== undefined) {
          optionCounts[selected]++;
          optionPhones[selected].push(resp.phone);
        }
      }
    }

    return {
      ...campaign,
      responses,
      optionCounts,
      optionPhones,
    };
  }

  // Get phones that selected a specific option
  async getPhonesByOption(campaignId: string, option: string) {
    const responses = await db
      .select()
      .from(pollResponses)
      .where(eq(pollResponses.pollCampaignId, campaignId));

    return responses
      .filter((r) => (r.selectedOptions as string[]).includes(option))
      .map((r) => r.phone);
  }

  // Record a sent poll message (msgId → campaign mapping)
  async recordSentMessage(pollCampaignId: string, phone: string, whatsappMessageId: string) {
    await db.insert(pollSentMessages).values({ pollCampaignId, phone, whatsappMessageId });
  }

  // Find campaign by WhatsApp message ID (used when a poll vote comes in)
  async findCampaignByMessageId(whatsappMessageId: string) {
    const [sent] = await db
      .select()
      .from(pollSentMessages)
      .where(eq(pollSentMessages.whatsappMessageId, whatsappMessageId))
      .limit(1);

    if (!sent) return null;

    const [campaign] = await db
      .select()
      .from(pollCampaigns)
      .where(eq(pollCampaigns.id, sent.pollCampaignId))
      .limit(1);

    return campaign || null;
  }

  // Find campaign by question text (fallback for matching incoming poll votes)
  async findCampaignByQuestion(userId: string, question: string) {
    const campaigns = await db
      .select()
      .from(pollCampaigns)
      .where(eq(pollCampaigns.userId, userId))
      .orderBy(desc(pollCampaigns.createdAt));

    return campaigns.find(
      (c) => c.question.toLowerCase().trim() === question.toLowerCase().trim()
    ) || null;
  }

  // Delete a poll campaign
  async deleteCampaign(campaignId: string) {
    const [deleted] = await db
      .delete(pollCampaigns)
      .where(eq(pollCampaigns.id, campaignId))
      .returning({ id: pollCampaigns.id });
    return !!deleted;
  }
}
