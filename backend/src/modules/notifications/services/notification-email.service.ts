import { db } from "../../../config/database.js";
import { notificationEmails } from "../../../infrastructure/database/schema/notification-emails.js";
import { users } from "../../../infrastructure/database/schema/users.js";
import { eq, and } from "drizzle-orm";
import { logger } from "../../../config/logger.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Si la tabla notification_emails no existe todavía en esta base de datos
// (por ejemplo, la migración no corrió), que esto degrade a "sin correos
// adicionales" en vez de tumbar el envío de campañas/correos que dependen
// de esto — nunca debe romper un flujo que ya funcionaba antes de esta
// función existir.
function isMissingTableError(err: any): boolean {
  return err?.code === "42P01" || /relation .* does not exist/i.test(err?.message || "");
}

export class NotificationEmailService {
  async list(userId: string) {
    try {
      return await db
        .select({ id: notificationEmails.id, email: notificationEmails.email, createdAt: notificationEmails.createdAt })
        .from(notificationEmails)
        .where(eq(notificationEmails.userId, userId));
    } catch (err: any) {
      if (isMissingTableError(err)) {
        logger.error("notification_emails no existe todavía — revisa que la migración 0002 haya corrido");
        return [];
      }
      throw err;
    }
  }

  async add(userId: string, email: string) {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalized)) {
      throw new Error("Correo inválido");
    }

    const existing = await db
      .select({ id: notificationEmails.id })
      .from(notificationEmails)
      .where(and(eq(notificationEmails.userId, userId), eq(notificationEmails.email, normalized)))
      .limit(1);

    if (existing.length > 0) {
      throw new Error("Ese correo ya está registrado");
    }

    const [created] = await db
      .insert(notificationEmails)
      .values({ userId, email: normalized })
      .returning({ id: notificationEmails.id, email: notificationEmails.email, createdAt: notificationEmails.createdAt });

    return created;
  }

  async remove(userId: string, id: string) {
    const [deleted] = await db
      .delete(notificationEmails)
      .where(and(eq(notificationEmails.id, id), eq(notificationEmails.userId, userId)))
      .returning({ id: notificationEmails.id });

    return !!deleted;
  }

  /**
   * Correo de la cuenta + todos los correos de notificación adicionales que
   * el usuario haya registrado, sin duplicados. El correo de la cuenta
   * siempre recibe el aviso — los adicionales solo se suman.
   */
  async getRecipientEmails(userId: string): Promise<string[]> {
    const account = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);

    const emails = new Set<string>();
    if (account[0]?.email) emails.add(account[0].email);

    for (const row of await this.list(userId)) {
      emails.add(row.email);
    }

    return Array.from(emails);
  }
}

export const notificationEmailService = new NotificationEmailService();
