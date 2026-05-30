import { Queue, Worker, Job } from "bullmq";
import { redis } from "../../config/redis.js";
import { logger } from "../../config/logger.js";
import { db } from "../../config/database.js";
import { messages } from "../database/schema/messages.js";
import { campaigns } from "../database/schema/campaigns.js";
import { getWhatsAppProvider } from "../whatsapp/whatsapp.factory.js";
import { eq, sql } from "drizzle-orm";
import { campaignBroadcast } from "../../modules/campaign-control/websocket/campaign-broadcast.js";
import { sendCampaignCompletedEmail } from "../email/email.service.js";
import { users } from "../database/schema/users.js";
import { getCountryFromPhone, getConversationRate, getCategoryFromTemplate } from "../../modules/consumption/meta-pricing.js";
import { whatsappSessions } from "../database/schema/whatsapp-sessions.js";

export interface MessageJobData {
  messageId: string;
  sessionId: string;
  phone: string;
  content: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio" | "document";
  campaignId?: string;
  messagesPerMinute?: number;
  templateCategory?: string;
  template?: {
    name: string;
    language: string;
    components: Array<{
      type: string;
      parameters: Array<{ type: "text"; text: string }>;
    }>;
  };
}

export const messageQueue = new Queue<MessageJobData>("messages", {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export function startMessageWorker() {
  const worker = new Worker<MessageJobData>(
    "messages",
    async (job: Job<MessageJobData>) => {
      const { messageId, sessionId, phone, content, mediaUrl, mediaType, campaignId, messagesPerMinute, template, templateCategory } = job.data;

      logger.info({ messageId, phone }, "Processing message");

      // Dynamic rate limiting based on messagesPerMinute
      const rate = messagesPerMinute || 8;
      const delay = Math.floor(60000 / rate) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

      // Update status to sending
      await db.update(messages).set({ status: "sending" }).where(eq(messages.id, messageId));

      const provider = await getWhatsAppProvider(sessionId);

      // Simulate typing (skip for template messages — Meta doesn't support it)
      if (!template) {
        try {
          const jid = `${phone.replace(/\D/g, "")}@s.whatsapp.net`;
          await provider.sendPresenceUpdate(sessionId, "composing", jid);
          const typingMs = Math.min(Math.max(content.length * 20, 1000), 4000);
          await new Promise(r => setTimeout(r, typingMs));
          await provider.sendPresenceUpdate(sessionId, "paused", jid);
        } catch {}
      }

      const result = await provider.sendMessage(sessionId, {
        phone,
        message: content,
        mediaUrl,
        mediaType,
        template: template as any,
      });

      if (result.success) {
        const updateFields: Record<string, any> = {
          status: "sent",
          whatsappMessageId: result.messageId,
          sentAt: new Date(),
        };

        // Calculate estimated cost for Meta Cloud sessions
        if (templateCategory) {
          try {
            const [session] = await db
              .select({ connectionType: whatsappSessions.connectionType })
              .from(whatsappSessions)
              .where(eq(whatsappSessions.id, sessionId))
              .limit(1);

            if (session?.connectionType === "meta_cloud") {
              const category = getCategoryFromTemplate(templateCategory);
              const country = getCountryFromPhone(phone);
              const cost = getConversationRate(country, category);
              updateFields.estimatedCost = cost.toString();
              updateFields.conversationCategory = category;
            }
          } catch {}
        }

        await db
          .update(messages)
          .set(updateFields)
          .where(eq(messages.id, messageId));

        if (campaignId) {
          await db
            .update(campaigns)
            .set({ sentCount: sql`${campaigns.sentCount} + 1` })
            .where(eq(campaigns.id, campaignId));

          const [updatedCampaign] = await db
            .select({
              userId: campaigns.userId,
              sentCount: campaigns.sentCount,
              failedCount: campaigns.failedCount,
              totalContacts: campaigns.totalContacts,
            })
            .from(campaigns)
            .where(eq(campaigns.id, campaignId));

          if (updatedCampaign) {
            const sent = updatedCampaign.sentCount ?? 0;
            const failed = updatedCampaign.failedCount ?? 0;
            const total = updatedCampaign.totalContacts ?? 0;
            const pending = total - sent - failed;
            campaignBroadcast.broadcast(updatedCampaign.userId, "campaign_progress", {
              campaignId,
              phone,
              status: "sent",
              sent,
              failed,
              total,
              pending,
            });

            if (pending === 0) {
              await db.update(campaigns).set({ status: "completed", completedAt: new Date() }).where(eq(campaigns.id, campaignId));
              const [campaignRow] = await db.select({ name: campaigns.name }).from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
              const [user] = await db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, updatedCampaign.userId)).limit(1);
              if (user) {
                sendCampaignCompletedEmail(user.email, user.name, campaignRow?.name || "Campaña", { sent, failed, total }).catch(() => {});
              }
            }
          }
        }

        logger.info({ messageId, whatsappId: result.messageId }, "Message sent");
      } else {
        await db
          .update(messages)
          .set({ status: "failed", errorMessage: result.error })
          .where(eq(messages.id, messageId));

        if (campaignId) {
          await db
            .update(campaigns)
            .set({ failedCount: sql`${campaigns.failedCount} + 1` })
            .where(eq(campaigns.id, campaignId));

          const [updatedCampaignFail] = await db
            .select({
              userId: campaigns.userId,
              sentCount: campaigns.sentCount,
              failedCount: campaigns.failedCount,
              totalContacts: campaigns.totalContacts,
            })
            .from(campaigns)
            .where(eq(campaigns.id, campaignId));

          if (updatedCampaignFail) {
            const sent = updatedCampaignFail.sentCount ?? 0;
            const failed = updatedCampaignFail.failedCount ?? 0;
            const total = updatedCampaignFail.totalContacts ?? 0;
            campaignBroadcast.broadcast(updatedCampaignFail.userId, "campaign_progress", {
              campaignId,
              phone,
              status: "failed",
              error: result.error,
              sent,
              failed,
              total,
              pending: total - sent - failed,
            });
          }
        }

        throw new Error(result.error || "Message send failed");
      }
    },
    {
      connection: redis as any,
      concurrency: 1, // One at a time for rate limiting
    }
  );

  worker.on("completed", (job) => {
    logger.debug({ jobId: job.id }, "Message job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, "Message job failed");
  });

  return worker;
}
