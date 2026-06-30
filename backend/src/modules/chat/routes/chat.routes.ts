import { FastifyInstance } from "fastify";
import { authGuard, licenseGuard } from "../../../shared/middleware/auth.middleware.js";
import { chatService } from "../services/chat.service.js";
import { chatBroadcast } from "../websocket/chat-broadcast.js";
import { mediaStorageService } from "../services/media-storage.service.js";
import { db } from "../../../config/database.js";
import { whatsappSessions } from "../../../infrastructure/database/schema/whatsapp-sessions.js";
import { chatMessages } from "../../../infrastructure/database/schema/chat.js";
import { decrypt } from "../../../infrastructure/security/encryption.service.js";
import { eq, and } from "drizzle-orm";

export async function chatRoutes(app: FastifyInstance) {
  app.get("/ws", { websocket: true }, async (socket, req) => {
    const token = (req.query as any).token;
    const sessionId = (req.query as any).sessionId;

    if (!token || !sessionId) {
      socket.close(4001, "Token and sessionId required");
      return;
    }

    let userId: string;
    try {
      const decoded = app.jwt.verify<{ id: string }>(token);
      userId = decoded.id;
    } catch {
      socket.close(4001, "Invalid token");
      return;
    }

    const [session] = await db
      .select({ id: whatsappSessions.id, userId: whatsappSessions.userId })
      .from(whatsappSessions)
      .where(eq(whatsappSessions.id, sessionId))
      .limit(1);

    if (!session || session.userId !== userId) {
      socket.close(4003, "Session not found or not owned");
      return;
    }

    chatBroadcast.addClient(socket, sessionId);

    socket.on("message", async (raw: Buffer | string) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.event === "send_message") {
          const saved = await chatService.sendMessage(
            msg.sessionId,
            msg.phone,
            msg.text,
            userId
          );
          chatBroadcast.broadcast(msg.sessionId, "new_message", saved);
        }
      } catch (err: any) {
        socket.send(JSON.stringify({ event: "error", data: err.message }));
      }
    });
  });

  app.get("/conversations", { preHandler: [authGuard, licenseGuard("chatLive")] }, async (req) => {
    const { sessionId } = req.query as any;
    const userId = (req as any).user.id;
    if (!sessionId || sessionId === "all") {
      return chatService.getAllConversations(userId);
    }
    return chatService.getConversations(sessionId, userId);
  });

  app.get("/messages", { preHandler: [authGuard] }, async (req) => {
    const { sessionId, phone, limit, before } = req.query as any;
    const userId = (req as any).user.id;
    if (!sessionId || !phone)
      throw new Error("sessionId and phone required");
    return chatService.getMessages(
      sessionId,
      phone,
      userId,
      Number(limit) || 50,
      before
    );
  });

  app.post("/upload", { preHandler: [authGuard, licenseGuard("chatLive")] }, async (req) => {
    const data = await req.file();
    if (!data) throw new Error("No file uploaded");
    const buffer = await data.toBuffer();
    return mediaStorageService.saveUploadedFile(buffer, data.filename, data.mimetype);
  });

  app.post("/send", { preHandler: [authGuard, licenseGuard("chatLive")] }, async (req) => {
    const { sessionId, phone, text, mediaUrl, mediaType } = req.body as any;
    const userId = (req as any).user.id;
    if (!sessionId || !phone) throw new Error("sessionId and phone required");
    if (!text && !mediaUrl) throw new Error("text or mediaUrl required");

    const saved = await chatService.sendMessage(
      sessionId, phone, text || "", userId, mediaUrl, mediaType
    );
    chatBroadcast.broadcast(sessionId, "new_message", saved);
    return saved;
  });

  app.patch("/conversations/stage", { preHandler: [authGuard, licenseGuard("chatLive")] }, async (req) => {
    const { phone, stage } = req.body as { phone: string; stage: string };
    const userId = (req as any).user.id;
    if (!phone || !stage) throw new Error("phone and stage required");
    if (!["new", "in_progress", "waiting", "closed"].includes(stage)) throw new Error("Invalid stage");
    return chatService.updateConversationStage(userId, phone, stage);
  });

  app.patch("/conversations/name", { preHandler: [authGuard, licenseGuard("chatLive")] }, async (req) => {
    const { phone, name } = req.body as { phone: string; name: string };
    const userId = (req as any).user.id;
    if (!phone) throw new Error("phone required");
    return chatService.updateConversationName(userId, phone, name || "");
  });

  app.patch("/conversations/notes", { preHandler: [authGuard, licenseGuard("chatLive")] }, async (req) => {
    const { phone, notes } = req.body as { phone: string; notes: string };
    const userId = (req as any).user.id;
    if (!phone) throw new Error("phone required");
    return chatService.updateConversationNotes(userId, phone, notes || "");
  });

  app.patch("/conversations/tags", { preHandler: [authGuard, licenseGuard("chatLive")] }, async (req) => {
    const { phone, tags } = req.body as { phone: string; tags: string[] };
    const userId = (req as any).user.id;
    if (!phone) throw new Error("phone required");
    return chatService.updateConversationTags(userId, phone, tags || []);
  });

  // Send approved Meta Cloud template from live chat
  app.post("/send-template", { preHandler: [authGuard, licenseGuard("chatLive")] }, async (req, reply) => {
    const { sessionId, phone, templateName, language, components } = req.body as {
      sessionId: string;
      phone: string;
      templateName: string;
      language: string;
      components?: any[];
    };
    const userId = (req as any).user.id;

    if (!sessionId || !phone || !templateName || !language) {
      return reply.status(422).send({ error: "sessionId, phone, templateName and language are required" });
    }

    const [session] = await db
      .select()
      .from(whatsappSessions)
      .where(and(eq(whatsappSessions.id, sessionId), eq(whatsappSessions.userId, userId)))
      .limit(1);

    if (!session) return reply.status(404).send({ error: "Session not found" });
    if (session.connectionType !== "meta_cloud") return reply.status(400).send({ error: "Template sending only supported for Meta Cloud sessions" });
    if (!session.metaAccessToken || !session.metaPhoneNumberId) return reply.status(400).send({ error: "Session missing Meta credentials" });

    const accessToken = decrypt(session.metaAccessToken);

    const payload: any = {
      messaging_product: "whatsapp",
      to: phone.replace(/\D/g, ""),
      type: "template",
      template: {
        name: templateName,
        language: { code: language },
      },
    };
    if (components && components.length > 0) {
      payload.template.components = components;
    }

    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${session.metaPhoneNumberId}/messages`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const metaData: any = await metaRes.json();
    if (!metaRes.ok) {
      return reply.status(502).send({ error: metaData.error?.message || "Meta API error" });
    }

    const [saved] = await db.insert(chatMessages).values({
      sessionId,
      phone: phone.replace(/\D/g, ""),
      content: `[Plantilla: ${templateName}]`,
      direction: "outgoing",
      senderType: "human",
      whatsappMessageId: metaData.messages?.[0]?.id,
      status: "sent",
    }).returning();

    chatBroadcast.broadcast(sessionId, "new_message", saved);
    return { success: true, data: saved };
  });

  app.get("/unread", { preHandler: [authGuard] }, async (req) => {
    const userId = (req as any).user.id;
    const counts = await chatService.getUnreadCounts(userId);
    const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
    return { counts, total };
  });

  app.post("/mark-read", { preHandler: [authGuard] }, async (req) => {
    const { phone } = req.body as { phone: string };
    const userId = (req as any).user.id;
    if (!phone) throw new Error("phone required");
    await chatService.markAsRead(userId, phone);
    return { success: true };
  });
}
