import { Queue, Worker, Job } from "bullmq";
import { redis } from "../../config/redis.js";
import { logger } from "../../config/logger.js";
import { db } from "../../config/database.js";
import { campaigns } from "../database/schema/campaigns.js";
import { contacts } from "../database/schema/contacts.js";
import { messages } from "../database/schema/messages.js";
import { messageQueue } from "./message.queue.js";
import { eq, and, sql } from "drizzle-orm";

export interface CampaignJobData {
  campaignId: string;
  userId: string;
  sessionId: string;
  messagesPerMinute?: number;
}

export const campaignQueue = new Queue<CampaignJobData>("campaigns", {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  },
});

export function startCampaignWorker() {
  const worker = new Worker<CampaignJobData>(
    "campaigns",
    async (job: Job<CampaignJobData>) => {
      const { campaignId, userId, sessionId, messagesPerMinute } = job.data;

      logger.info({ campaignId }, "Starting campaign execution");

      // Get campaign details
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, campaignId));

      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
      }

      // Update campaign status
      await db
        .update(campaigns)
        .set({ status: "running", startedAt: new Date() })
        .where(eq(campaigns.id, campaignId));

      // Get target contacts
      const targetContacts = await db
        .select()
        .from(contacts)
        .where(eq(contacts.userId, userId));

      // Filter by tags if specified
      const filteredContacts =
        campaign.targetTags && (campaign.targetTags as string[]).length > 0
          ? targetContacts.filter((c) => {
              const contactTags = (c.tags as string[]) || [];
              return (campaign.targetTags as string[]).some((tag) => contactTags.includes(tag));
            })
          : targetContacts;

      // Update total contacts
      await db
        .update(campaigns)
        .set({ totalContacts: filteredContacts.length })
        .where(eq(campaigns.id, campaignId));

      // Create message records and queue jobs
      for (const contact of filteredContacts) {
        // Personalize message with contact fields and metadata variables
        let personalizedMessage = campaign.message
          .replace(/\{\{name\}\}/g, contact.name || "")
          .replace(/\{\{phone\}\}/g, contact.phone)
          .replace(/\{\{email\}\}/g, contact.email || "");

        // Replace metadata variables (extra Excel columns like {{ciudad}}, {{empresa}})
        const metadata = (contact.metadata as Record<string, string>) || {};
        for (const [key, value] of Object.entries(metadata)) {
          personalizedMessage = personalizedMessage.replace(
            new RegExp(`\\{\\{${key}\\}\\}`, "g"),
            value || ""
          );
        }

        // Create message record
        const [msg] = await db
          .insert(messages)
          .values({
            userId,
            contactId: contact.id,
            campaignId,
            phone: contact.phone,
            content: personalizedMessage,
            mediaUrl: campaign.mediaUrl,
            mediaType: campaign.mediaType,
            status: "queued",
          })
          .returning();

        // Add to message queue
        await messageQueue.add(
          `msg-${msg.id}`,
          {
            messageId: msg.id,
            sessionId,
            phone: contact.phone,
            content: personalizedMessage,
            mediaUrl: campaign.mediaUrl || undefined,
            mediaType: (campaign.mediaType as any) || undefined,
            campaignId,
            messagesPerMinute: messagesPerMinute || 8,
          },
          { priority: 2 } // Lower priority than direct messages
        );
      }

      logger.info(
        { campaignId, totalContacts: filteredContacts.length },
        "Campaign messages queued"
      );
    },
    { connection: redis as any, concurrency: 2 }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, "Campaign job failed");
    if (job) {
      db.update(campaigns)
        .set({ status: "failed" })
        .where(eq(campaigns.id, job.data.campaignId))
        .catch(() => {});
    }
  });

  return worker;
}
