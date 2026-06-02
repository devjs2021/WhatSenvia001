import { Queue, Worker, Job } from "bullmq";
import { redis } from "../../config/redis.js";
import { logger } from "../../config/logger.js";
import { db } from "../../config/database.js";
import { campaigns } from "../database/schema/campaigns.js";
import { contacts } from "../database/schema/contacts.js";
import { messages } from "../database/schema/messages.js";
import { metaTemplates } from "../database/schema/meta-templates.js";
import { messageQueue } from "./message.queue.js";
import { eq, and, sql } from "drizzle-orm";
import { notificationService } from "../../modules/notifications/services/notification.service.js";

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

      // Resolve contacts: embedded (unified flow) or tag-based (legacy flow)
      const embeddedContacts = campaign.contacts as Array<Record<string, string>> | null;
      const contactsToProcess: Array<{ id?: string; phone: string; name: string; email: string | null; metadata: Record<string, string> }> = [];

      if (embeddedContacts && embeddedContacts.length > 0) {
        for (const ec of embeddedContacts) {
          const phone = ec.phone?.replace(/[^0-9]/g, "");
          if (!phone || phone.length < 10) continue;
          const [existing] = await db.select({ id: contacts.id }).from(contacts)
            .where(and(eq(contacts.userId, userId), eq(contacts.phone, phone))).limit(1);
          if (existing) {
            contactsToProcess.push({
              id: existing.id, phone, name: ec.name || "", email: ec.email || null,
              metadata: Object.fromEntries(Object.entries(ec).filter(([k]) => !["phone", "name", "email"].includes(k))),
            });
          } else {
            const meta = Object.fromEntries(Object.entries(ec).filter(([k]) => !["phone", "name", "email"].includes(k)));
            const [created] = await db.insert(contacts).values({
              userId, phone, name: ec.name || "", email: ec.email || null, tags: [], metadata: meta,
            }).returning({ id: contacts.id });
            contactsToProcess.push({ id: created.id, phone, name: ec.name || "", email: ec.email || null, metadata: meta });
          }
        }
      } else {
        const targetContacts = await db
          .select()
          .from(contacts)
          .where(eq(contacts.userId, userId));

        const filteredContacts =
          campaign.targetTags && (campaign.targetTags as string[]).length > 0
            ? targetContacts.filter((c) => {
                const contactTags = (c.tags as string[]) || [];
                return (campaign.targetTags as string[]).some((tag) => contactTags.includes(tag));
              })
            : targetContacts;

        contactsToProcess.push(...filteredContacts.map((c) => ({
          id: c.id,
          phone: c.phone,
          name: c.name || "",
          email: c.email || null,
          metadata: (c.metadata as Record<string, string>) || {},
        })));
      }

      // Update total contacts
      await db
        .update(campaigns)
        .set({ totalContacts: contactsToProcess.length })
        .where(eq(campaigns.id, campaignId));

      // Resolve meta template if this is a template campaign
      let metaTemplate: { name: string; language: string; components: any[] } | null = null;
      let paramMapping: Record<string, string[]> | null = null;
      let templateCategory: string | undefined;

      if (campaign.isTemplateCampaign && campaign.metaTemplateId) {
        const [tpl] = await db
          .select()
          .from(metaTemplates)
          .where(eq(metaTemplates.id, campaign.metaTemplateId))
          .limit(1);

        if (tpl) {
          metaTemplate = { name: tpl.name, language: tpl.language, components: (tpl.components as any[]) || [] };
          paramMapping = (campaign.templateParams as Record<string, string[]>) || null;
          templateCategory = tpl.category;
        }
      }

      // Create message records and queue jobs
      for (const contact of contactsToProcess) {
        const metadata = contact.metadata;
        let personalizedMessage = campaign.message
          .replace(/\{\{name\}\}/g, contact.name || "")
          .replace(/\{\{phone\}\}/g, contact.phone)
          .replace(/\{\{email\}\}/g, contact.email || "");

        for (const [key, value] of Object.entries(metadata)) {
          personalizedMessage = personalizedMessage.replace(
            new RegExp(`\\{\\{${key}\\}\\}`, "g"),
            value || ""
          );
        }

        // Build template data per contact if template campaign
        let templateData: { name: string; language: string; components: Array<{ type: string; parameters: Array<{ type: "text"; text: string }> }> } | undefined;

        if (metaTemplate && paramMapping) {
          const resolveParam = (field: string): string => {
            if (field === "name") return contact.name || "";
            if (field === "phone") return contact.phone;
            if (field === "email") return contact.email || "";
            if (field.startsWith("metadata.")) return metadata[field.slice(9)] || "";
            return metadata[field] || "";
          };

          const components: Array<{ type: string; parameters: Array<{ type: "text"; text: string }> }> = [];
          for (const [componentType, fields] of Object.entries(paramMapping)) {
            if (fields.length > 0) {
              components.push({
                type: componentType,
                parameters: fields.map((f) => ({ type: "text" as const, text: resolveParam(f) })),
              });
            }
          }
          templateData = { name: metaTemplate.name, language: metaTemplate.language, components };
        }

        // Create message record
        const [msg] = await db
          .insert(messages)
          .values({
            userId,
            contactId: contact.id!,
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
            templateCategory,
            template: templateData,
          },
          { priority: 2 }
        );
      }

      logger.info(
        { campaignId, totalContacts: contactsToProcess.length },
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
      notificationService.create(
        job.data.userId,
        "campaign_failed",
        "Error en campaña",
        `La campaña falló: ${err.message}`,
        { campaignId: job.data.campaignId, error: err.message }
      ).catch(() => {});
    }
  });

  return worker;
}
