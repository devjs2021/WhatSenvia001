import { FastifyInstance } from "fastify";
import { authGuard, licenseGuard } from "../../../shared/middleware/auth.middleware.js";
import { chatService } from "../services/chat.service.js";
import { chatBroadcast } from "../websocket/chat-broadcast.js";

export async function chatRoutes(app: FastifyInstance) {
  // WebSocket endpoint (no preHandler for WS)
  app.get("/ws", { websocket: true }, (socket, req) => {
    const sessionId = (req.query as any).sessionId;
    if (!sessionId) {
      socket.close();
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
            msg.text
          );
          chatBroadcast.broadcast(msg.sessionId, "new_message", saved);
        }
      } catch (err: any) {
        socket.send(JSON.stringify({ event: "error", data: err.message }));
      }
    });
  });

  // REST endpoints with auth
  app.get("/conversations", { preHandler: [authGuard, licenseGuard("chatLive")] }, async (req) => {
    const { sessionId } = req.query as any;
    if (!sessionId) throw new Error("sessionId required");
    return chatService.getConversations(sessionId);
  });

  app.get("/messages", { preHandler: [authGuard] }, async (req) => {
    const { sessionId, phone, limit, before } = req.query as any;
    if (!sessionId || !phone)
      throw new Error("sessionId and phone required");
    return chatService.getMessages(
      sessionId,
      phone,
      Number(limit) || 50,
      before
    );
  });

  app.post("/send", { preHandler: [authGuard, licenseGuard("chatLive")] }, async (req) => {
    const { sessionId, phone, text } = req.body as any;
    if (!sessionId || !phone || !text)
      throw new Error("sessionId, phone, text required");

    const saved = await chatService.sendMessage(sessionId, phone, text);
    chatBroadcast.broadcast(sessionId, "new_message", saved);
    return saved;
  });
}
