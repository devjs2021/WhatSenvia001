import { db } from "../../../config/database.js";
import { notificationEmails } from "../../../infrastructure/database/schema/notification-emails.js";
import { users } from "../../../infrastructure/database/schema/users.js";
import { eq, and } from "drizzle-orm";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class NotificationEmailService {
  async list(userId: string) {
    return db
      .select({ id: notificationEmails.id, email: notificationEmails.email, createdAt: notificationEmails.createdAt })
      .from(notificationEmails)
      .where(eq(notificationEmails.userId, userId));
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
    const [account, extra] = await Promise.all([
      db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1),
      db.select({ email: notificationEmails.email }).from(notificationEmails).where(eq(notificationEmails.userId, userId)),
    ]);

    const emails = new Set<string>();
    if (account[0]?.email) emails.add(account[0].email);
    for (const row of extra) emails.add(row.email);

    return Array.from(emails);
  }
}

export const notificationEmailService = new NotificationEmailService();
