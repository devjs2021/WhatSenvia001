import { FastifyInstance } from "fastify";
import { authGuard } from "../../../shared/middleware/auth.middleware.js";
import { notificationService } from "../services/notification.service.js";
import { notificationBroadcast } from "../websocket/notification-broadcast.js";

export async function notificationRoutes(app: FastifyInstance) {
  // WebSocket for real-time notifications
  app.get("/ws", { websocket: true }, async (socket, req) => {
    const token = (req.query as any).token;
    if (!token) {
      socket.close(4001, "Token required");
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

    notificationBroadcast.addClient(socket, userId);
  });

  // Get notifications
  app.get("/", { preHandler: [authGuard] }, async (req) => {
    const userId = (req as any).user.id;
    const items = await notificationService.getByUser(userId);
    const unreadCount = await notificationService.getUnreadCount(userId);
    return { items, unreadCount };
  });

  // Mark one as read
  app.patch("/:id/read", { preHandler: [authGuard] }, async (req) => {
    const userId = (req as any).user.id;
    const { id } = req.params as { id: string };
    await notificationService.markAsRead(userId, id);
    return { success: true };
  });

  // Mark all as read
  app.patch("/read-all", { preHandler: [authGuard] }, async (req) => {
    const userId = (req as any).user.id;
    await notificationService.markAllAsRead(userId);
    return { success: true };
  });
}
