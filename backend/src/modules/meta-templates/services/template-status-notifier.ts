import { db } from "../../../config/database.js";
import { campaigns } from "../../../infrastructure/database/schema/campaigns.js";
import { users } from "../../../infrastructure/database/schema/users.js";
import { eq, and } from "drizzle-orm";
import { sendTemplateStatusEmail } from "../../../infrastructure/email/email.service.js";
import { notificationEmailService } from "../../notifications/services/notification-email.service.js";
import { logger } from "../../../config/logger.js";

const NOTIFIABLE_STATUSES = new Set(["APPROVED", "REJECTED"]);

/**
 * Avisa por correo al dueño de una plantilla cuando Meta responde (aprueba o
 * rechaza), directamente por metaTemplates.userId — sin depender de si hay una
 * campaña asociada a la plantilla. Si el estado no cambió respecto al último
 * sync, no hace nada (evita reenviar el mismo correo cada 5 minutos).
 *
 * Si una campaña estaba esperando esta plantilla (status "pending_approval") y
 * la plantilla fue rechazada, la campaña se marca como rechazada.
 */
export async function notifyTemplateStatusChange(params: {
  templateId: string;
  ownerId: string;
  templateName: string;
  oldStatus: string;
  newStatus: string;
}): Promise<void> {
  const { templateId, ownerId, templateName, oldStatus, newStatus } = params;

  if (oldStatus === newStatus) return;
  if (!NOTIFIABLE_STATUSES.has(newStatus)) return;

  const [owner] = await db.select({ name: users.name }).from(users).where(eq(users.id, ownerId)).limit(1);
  const recipients = await notificationEmailService.getRecipientEmails(ownerId);

  if (owner && recipients.length > 0) {
    sendTemplateStatusEmail(
      recipients,
      owner.name,
      templateName,
      newStatus as "APPROVED" | "REJECTED",
      newStatus === "REJECTED" ? "Template rechazado por Meta" : undefined
    ).catch((err: any) =>
      logger.error({ error: err.message, templateId }, "Failed to send template status email")
    );
  }

  if (newStatus === "REJECTED") {
    const pendingCampaigns = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(and(eq(campaigns.metaTemplateId, templateId), eq(campaigns.status, "pending_approval" as any)));

    for (const pc of pendingCampaigns) {
      await db
        .update(campaigns)
        .set({ status: "rejected", rejectionReason: "Template rechazado por Meta", updatedAt: new Date() })
        .where(eq(campaigns.id, pc.id));
      logger.info({ campaignId: pc.id }, "Campaign rejected due to template rejection");
    }
  }
}
