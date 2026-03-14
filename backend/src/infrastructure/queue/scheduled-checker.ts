import { logger } from "../../config/logger.js";
import { scheduledService } from "../../modules/scheduled/services/scheduled.service.js";
import { messageQueue } from "./message.queue.js";
import { db } from "../../config/database.js";
import { scheduledCampaigns } from "../database/schema/scheduled-campaigns.js";
import { eq } from "drizzle-orm";

async function checkScheduledCampaigns() {
  try {
    const pending = await scheduledService.getPending();

    for (const campaign of pending) {
      logger.info({ id: campaign.id, name: campaign.name }, "Executing scheduled campaign");

      await scheduledService.markRunning(campaign.id);

      const contacts = campaign.contacts as Array<Record<string, string>>;
      const options = (campaign.options as Record<string, any>) || {};
      const messagesPerMinute = options.messagesPerMinute || 8;

      let queuedCount = 0;

      for (const contact of contacts) {
        const phone = contact.phone;
        if (!phone) continue;

        // Personalize message
        let personalizedMessage = campaign.message;
        for (const [key, value] of Object.entries(contact)) {
          personalizedMessage = personalizedMessage.replace(
            new RegExp(`\\{\\{${key}\\}\\}`, "g"),
            value || ""
          );
        }

        // Add to message queue - worker handles sending
        await (messageQueue as any).add(
          "scheduled-msg",
          {
            sessionId: campaign.sessionId,
            phone,
            content: personalizedMessage,
            messagesPerMinute,
            scheduledCampaignId: campaign.id,
          },
          { priority: 2 }
        );

        queuedCount++;
      }

      // Update total contacts queued
      await db
        .update(scheduledCampaigns)
        .set({ totalContacts: queuedCount })
        .where(eq(scheduledCampaigns.id, campaign.id));

      await scheduledService.markCompleted(campaign.id, queuedCount, 0);

      logger.info(
        { id: campaign.id, queued: queuedCount },
        "Scheduled campaign messages queued"
      );
    }
  } catch (err: any) {
    logger.error({ error: err.message }, "Error checking scheduled campaigns");
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startScheduledChecker() {
  checkScheduledCampaigns();
  intervalId = setInterval(checkScheduledCampaigns, 60_000);
  logger.info("Scheduled campaign checker started (60s interval)");
}

export function stopScheduledChecker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
