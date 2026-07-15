import { db } from "../../../config/database.js";
import { users } from "../../../infrastructure/database/schema/users.js";
import { eq } from "drizzle-orm";
import { sendQualityAlertEmail } from "../../../infrastructure/email/email.service.js";
import { notificationEmailService } from "../../notifications/services/notification-email.service.js";
import { notificationService } from "../../notifications/services/notification.service.js";
import { logger } from "../../../config/logger.js";

async function notifyUser(userId: string, title: string, body: string, sendEmail: boolean, metadata?: Record<string, any>) {
  await notificationService.create(userId, "quality_alert", title, body, metadata).catch((err: any) =>
    logger.error({ error: err.message }, "Failed to create in-app quality alert notification")
  );

  if (!sendEmail) return;

  const [owner] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
  const recipients = await notificationEmailService.getRecipientEmails(userId);

  if (owner && recipients.length > 0) {
    sendQualityAlertEmail(recipients, owner.name, title, body).catch((err: any) =>
      logger.error({ error: err.message }, "Failed to send quality alert email")
    );
  }
}

export async function notifyPhoneQualityChange(userId: string, phone: string, event: string, currentLimit?: string) {
  const isConcerning = /DOWNGRADE|FLAGGED/i.test(event) && !/UNFLAG/i.test(event);
  const title = isConcerning
    ? `Alerta de calidad: número ${phone}`
    : `Actualización de número ${phone}`;
  const body = currentLimit
    ? `Evento de Meta: ${event}. Límite de mensajería actual: ${currentLimit}.`
    : `Evento de Meta: ${event}.`;

  await notifyUser(userId, title, body, isConcerning, { phone, event, currentLimit });
}

const QUALITY_RANK: Record<string, number> = { RED: 0, YELLOW: 1, GREEN: 2 };

export async function notifyTemplateQualityChange(
  userId: string,
  templateName: string,
  previousScore: string,
  newScore: string
) {
  const oldRank = QUALITY_RANK[previousScore] ?? -1;
  const newRank = QUALITY_RANK[newScore] ?? -1;
  const downgraded = oldRank !== -1 && newRank !== -1 && newRank < oldRank;

  const title = downgraded
    ? `La plantilla "${templateName}" bajó de calidad`
    : `La calidad de "${templateName}" cambió`;
  const body = `Calidad anterior: ${previousScore}. Calidad actual: ${newScore}.`
    + (newScore === "RED" ? " Meta puede pausar esta plantilla si no mejora." : "");

  await notifyUser(userId, title, body, downgraded, { templateName, previousScore, newScore });
}

export async function notifyAccountAlert(userId: string, alertType: string, severity: string, description: string) {
  const title = `Alerta de Meta: ${alertType.replace(/_/g, " ").toLowerCase()}`;
  await notifyUser(userId, title, description, severity !== "INFORMATIONAL", { alertType, severity });
}
