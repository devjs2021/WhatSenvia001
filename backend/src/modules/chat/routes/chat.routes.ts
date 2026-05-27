import { FastifyInstance } from "fastify";
import { authGuard, licenseGuard } from "../../../shared/middleware/auth.middleware.js";
import { chatService } from "../services/chat.service.js";
import { chatBroadcast } from "../websocket/chat-broadcast.js";
import { mediaStorageService } from "../services/media-storage.service.js";
import { db } from "../../../config/database.js";
import { whatsappSessions } from "../../../infrastructure/database/schema/whatsapp-sessions.js";
import { eq } from "drizzle-orm";

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
}
