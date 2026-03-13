import { db } from "../../../config/database.js";
import { messages } from "../../../infrastructure/database/schema/messages.js";
import { contacts } from "../../../infrastructure/database/schema/contacts.js";
import { eq, and, desc, count } from "drizzle-orm";
import { messageQueue } from "../../../infrastructure/queue/message.queue.js";

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "");
}

export class MessageService {
  async list(userId: string, page: number, limit: number, campaignId?: string) {
    const offset = (page - 1) * limit;
    const conditions = [eq(messages.userId, userId)];

    if (campaignId) {
      conditions.push(eq(messages.campaignId, campaignId));
    }

    const where = and(...conditions);

    const [data, [{ total }]] = await Promise.all([
      db.select().from(messages).where(where).orderBy(desc(messages.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(messages).where(where),
    ]);

    return { data, total };
  }

  async sendDirect(
    userId: string,
    sessionId: string,
    contactId: string,
    content: string,
    mediaUrl?: string,
    mediaType?: "image" | "video" | "audio" | "document"
  ) {
    // Get contact phone
    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
      .limit(1);

    if (!contact) throw new Error("Contact not found");

    // Create message record
    const [msg] = await db
      .insert(messages)
      .values({
        userId,
        contactId,
        phone: contact.phone,
        content,
        mediaUrl,
        mediaType,
        status: "queued",
      })
      .returning();

    // Queue with high priority
    await messageQueue.add(
      `direct-${msg.id}`,
      {
        messageId: msg.id,
        sessionId,
        phone: contact.phone,
        content,
        mediaUrl,
        mediaType,
      },
      { priority: 1 }
    );

    return msg;
  }

  async sendQuick(
    userId: string,
    sessionId: string,
    phone: string,
    content: string,
    mediaUrl?: string,
    mediaType?: "image" | "video" | "audio" | "document"
  ) {
    const normalized = normalizePhone(phone);

    // Find or create contact by phone
    let [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.phone, normalized), eq(contacts.userId, userId)))
      .limit(1);

    if (!contact) {
      [contact] = await db
        .insert(contacts)
        .values({
          userId,
          phone: normalized,
          name: normalized,
        })
        .returning();
    }

    // Create message record
    const [msg] = await db
      .insert(messages)
      .values({
        userId,
        contactId: contact.id,
        phone: normalized,
        content,
        mediaUrl,
        mediaType,
        status: "queued",
      })
      .returning();

    // Queue with high priority
    await messageQueue.add(
      `quick-${msg.id}`,
      {
        messageId: msg.id,
        sessionId,
        phone: normalized,
        content,
        mediaUrl,
        mediaType,
      },
      { priority: 1 }
    );

    return msg;
  }

  async getStats(userId: string) {
    const result = await db
      .select({
        status: messages.status,
        total: count(),
      })
      .from(messages)
      .where(eq(messages.userId, userId))
      .groupBy(messages.status);

    const stats: Record<string, number> = {
      queued: 0,
      sending: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    };

    for (const row of result) {
      stats[row.status] = row.total;
    }

    return stats;
  }
}
