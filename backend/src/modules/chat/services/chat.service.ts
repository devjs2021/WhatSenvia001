import { db } from "../../../config/database.js";
import { chatMessages } from "../../../infrastructure/database/schema/chat.js";
import { whatsappSessions } from "../../../infrastructure/database/schema/whatsapp-sessions.js";
import { eq, and, desc, sql, lt } from "drizzle-orm";
import { getWhatsAppProvider } from "../../../infrastructure/whatsapp/whatsapp.factory.js";

export class ChatService {

  /**
   * Verifies that a session belongs to the given userId.
   * Throws 403 if not found or not owned by the user.
   */
  private async verifySessionOwnership(sessionId: string, userId: string): Promise<void> {
    const [session] = await db
      .select({ id: whatsappSessions.id, userId: whatsappSessions.userId })
      .from(whatsappSessions)
      .where(eq(whatsappSessions.id, sessionId))
      .limit(1);

    if (!session) {
      throw new Error("Session not found");
    }
    if (session.userId !== userId) {
      throw new Error("Forbidden: session does not belong to this user");
    }
  }
  async saveMessage(data: {
    sessionId: string;
    phone: string;
    remoteJid?: string;
    content: string;
    direction: "incoming" | "outgoing";
    senderType: "user" | "bot" | "human";
    whatsappMessageId?: string;
    pushName?: string;
    mediaUrl?: string;
    mediaType?: string;
  }) {
    const [msg] = await db.insert(chatMessages).values(data).returning();
    return msg;
  }

  private mapConversationRows(rows: any[]) {
    const conversations = rows.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return conversations.map((row) => {
      let lastMessage = row.content;
      if (row.media_type && !row.content) {
        const labels: Record<string, string> = { image: "Imagen", video: "Video", audio: "Audio", document: "Documento" };
        lastMessage = `[${labels[row.media_type as string] || row.media_type}]`;
      }
      return {
        phone: row.phone,
        pushName: row.push_name || "",
        lastMessage,
        lastMessageDirection: row.direction,
        lastMessageSenderType: row.sender_type,
        lastMessageAt: row.created_at,
        status: row.status,
        mediaType: row.media_type || null,
        sessionId: row.session_id || null,
      };
    });
  }

  async getAllConversations(userId: string) {
    const userSessions = await db
      .select({ id: whatsappSessions.id })
      .from(whatsappSessions)
      .where(eq(whatsappSessions.userId, userId));

    if (userSessions.length === 0) return [];

    const sessionIds = userSessions.map((s) => s.id);
    const result = await db.execute(sql`
      SELECT DISTINCT ON (phone)
        phone, push_name, content, media_url, media_type, direction, sender_type, created_at, status, session_id
      FROM chat_messages
      WHERE session_id = ANY(${sessionIds})
      ORDER BY phone, created_at DESC
    `);

    return this.mapConversationRows(result.rows as any[]);
  }

  async getConversations(sessionId: string, userId: string) {
    await this.verifySessionOwnership(sessionId, userId);
    const result = await db.execute(sql`
      SELECT DISTINCT ON (phone)
        phone, push_name, content, media_url, media_type, direction, sender_type, created_at, status, session_id
      FROM chat_messages
      WHERE session_id = ${sessionId}
      ORDER BY phone, created_at DESC
    `);

    return this.mapConversationRows(result.rows as any[]);
  }

  async getMessages(
    sessionId: string,
    phone: string,
    userId: string,
    limit = 50,
    before?: string
  ) {
    await this.verifySessionOwnership(sessionId, userId);
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

  async sendMessage(
    sessionId: string,
    phone: string,
    text: string,
    userId: string,
    mediaUrl?: string,
    mediaType?: "image" | "video" | "audio" | "document"
  ) {
    await this.verifySessionOwnership(sessionId, userId);
    const provider = await getWhatsAppProvider(sessionId);

    if (text) {
      try {
        const jid = `${phone.replace(/\D/g, "")}@s.whatsapp.net`;
        await provider.sendPresenceUpdate(sessionId, "composing", jid);
        const typingMs = Math.min(Math.max(text.length * 20, 1000), 4000);
        await new Promise(r => setTimeout(r, typingMs));
        await provider.sendPresenceUpdate(sessionId, "paused", jid);
      } catch {}
    }

    const result = await provider.sendMessage(sessionId, {
      phone,
      message: text,
      mediaUrl,
      mediaType,
    });

    const saved = await this.saveMessage({
      sessionId,
      phone,
      content: text,
      direction: "outgoing",
      senderType: "human",
      whatsappMessageId: result.messageId,
      mediaUrl,
      mediaType,
    });

    return saved;
  }
}

export const chatService = new ChatService();
