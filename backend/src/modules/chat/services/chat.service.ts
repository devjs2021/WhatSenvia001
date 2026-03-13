import { db } from "../../../config/database.js";
import { chatMessages } from "../../../infrastructure/database/schema/chat.js";
import { eq, and, desc, sql, lt } from "drizzle-orm";
import { getWhatsAppProvider } from "../../../infrastructure/whatsapp/whatsapp.factory.js";

export class ChatService {
  async saveMessage(data: {
    sessionId: string;
    phone: string;
    remoteJid?: string;
    content: string;
    direction: "incoming" | "outgoing";
    senderType: "user" | "bot" | "human";
    whatsappMessageId?: string;
    pushName?: string;
  }) {
    const [msg] = await db.insert(chatMessages).values(data).returning();
    return msg;
  }

  async getConversations(sessionId: string) {
    // Get distinct conversations with last message using DISTINCT ON
    const result = await db.execute(sql`
      SELECT DISTINCT ON (phone)
        phone, push_name, content, direction, sender_type, created_at, status
      FROM chat_messages
      WHERE session_id = ${sessionId}
      ORDER BY phone, created_at DESC
    `);

    // Sort by most recent first
    const conversations = (result.rows as any[]).sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return conversations.map((row) => ({
      phone: row.phone,
      pushName: row.push_name || "",
      lastMessage: row.content,
      lastMessageDirection: row.direction,
      lastMessageSenderType: row.sender_type,
      lastMessageAt: row.created_at,
      status: row.status,
    }));
  }

  async getMessages(
    sessionId: string,
    phone: string,
    limit = 50,
    before?: string
  ) {
    const conditions = [
      eq(chatMessages.sessionId, sessionId),
      eq(chatMessages.phone, phone),
    ];

    if (before) {
      conditions.push(lt(chatMessages.createdAt, new Date(before)));
    }

    const msgs = await db
      .select()
      .from(chatMessages)
      .where(and(...conditions))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);

    return msgs.reverse(); // Return in chronological order
  }

  async sendMessage(sessionId: string, phone: string, text: string) {
    const provider = getWhatsAppProvider();

    // Simulate typing for human agent messages
    try {
      const jid = `${phone.replace(/\D/g, "")}@s.whatsapp.net`;
      await provider.sendPresenceUpdate(sessionId, "composing", jid);
      const typingMs = Math.min(Math.max(text.length * 20, 1000), 4000);
      await new Promise(r => setTimeout(r, typingMs));
      await provider.sendPresenceUpdate(sessionId, "paused", jid);
    } catch {}

    const result = await provider.sendMessage(sessionId, {
      phone,
      message: text,
    });

    const saved = await this.saveMessage({
      sessionId,
      phone,
      content: text,
      direction: "outgoing",
      senderType: "human",
      whatsappMessageId: result.messageId,
    });

    return saved;
  }
}

export const chatService = new ChatService();
