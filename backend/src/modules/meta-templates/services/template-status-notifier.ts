import { db } from "../../../config/database.js";
import { campaigns } from "../../../infrastructure/database/schema/campaigns.js";
import { users } from "../../../infrastructure/database/schema/users.js";
import { eq, and } from "drizzle-orm";
import { sendTemplateStatusEmail } from "../../../infrastructure/email/email.service.js";
import { notificationEmailService } from "../../notifications/services/notification-email.service.js";
import { logger } from "../../../config/logger.js";

const NOTIFIABLE_STATUSES = new Set(["APPROVED", "REJECTED"]);

// Valores documentados por Meta para el campo `rejected_reason` de un template.
const REJECTED_REASON_LABELS: Record<string, string> = {
  ABUSIVE_CONTENT: "El contenido fue considerado abusivo u ofensivo",
  INVALID_FORMAT: "El formato no es válido (revisa variables, saltos de línea o caracteres especiales)",
  PROMOTIONAL: "Contenido promocional no permitido para esta categoría (revisa si debería ser MARKETING)",
  TAG_CONTENT_MISMATCH: "La categoría elegida no coincide con el contenido del mensaje",
  SCAM: "El contenido fue marcado como posible fraude o estafa",
  NONE: "Meta no especificó un motivo",
};

function describeRejectionReason(rejectedReason?: string | null): string {
  if (!rejectedReason) return "Template rechazado por Meta";
  return REJECTED_REASON_LABELS[rejectedReason] || `Template rechazado por Meta (motivo: ${rejectedReason})`;
}

/**
 * Avisa por correo al dueño de una plantilla cuando Meta responde (aprueba o
 * rechaza), directamente por metaTemplates.userId — sin depender de si hay una
 * campaña asociada a la plantilla. Si el estado no cambió respecto al último
 * sync, no hace nada (evita reenviar el mismo correo cada 5 minutos).
 *
 * Si una campaña estaba esperando esta plantilla (status "pending_approval") y
 * la plantilla fue rechazada, la campaña se marca como rechazada con el mismo
 * motivo real que dio Meta.
 */
export async function notifyTemplateStatusChange(params: {
  templateId: string;
  ownerId: string;
  templateName: string;
  oldStatus: string;
  newStatus: string;
  rejectedReason?: string | null;
}): Promise<void> {
  const { templateId, ownerId, templateName, oldStatus, newStatus, rejectedReason } = params;

  if (oldStatus === newStatus) return;
  if (!NOTIFIABLE_STATUSES.has(newStatus)) return;

  const reasonText = newStatus === "REJECTED" ? describeRejectionReason(rejectedReason) : undefined;

  const [owner] = await db.select({ name: users.name }).from(users).where(eq(users.id, ownerId)).limit(1);
  const recipients = await notificationEmailService.getRecipientEmails(ownerId);

  if (owner && recipients.length > 0) {
    sendTemplateStatusEmail(
      recipients,
      owner.name,
      templateName,
      newStatus as "APPROVED" | "REJECTED",
      reasonText
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
        .set({ status: "rejected", rejectionReason: reasonText, updatedAt: new Date() })
        .where(eq(campaigns.id, pc.id));
      logger.info({ campaignId: pc.id }, "Campaign rejected due to template rejection");
    }
  }
}
