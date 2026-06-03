import { db } from "../../../config/database.js";
import { notifications } from "../../../infrastructure/database/schema/notifications.js";
import type { NotificationType } from "../../../infrastructure/database/schema/notifications.js";
import { notificationBroadcast } from "../websocket/notification-broadcast.js";
import { pushService } from "../../push/push.service.js";
import { eq, and, desc } from "drizzle-orm";

const typeUrlMap: Record<string, string> = {
  new_chat: "/chat-live",
  campaign_completed: "/campaigns",
  campaign_failed: "/campaigns",
  campaign_scheduled: "/campaigns",
  system_error: "/dashboard",
};

export const notificationService = {
  async create(userId: string, type: NotificationType, title: string, body?: string, metadata?: Record<string, any>) {
    const [notification] = await db
      .insert(notifications)
      .values({
        userId,
        type,
        title,
        body: body || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      })
      .returning();

    notificationBroadcast.broadcast(userId, "new_notification", notification);

    pushService.sendToUser(userId, {
      title,
      body: body || undefined,
      type,
      url: typeUrlMap[type] || "/dashboard",
    }).catch(() => {});

    return notification;
  },

  async getByUser(userId: string, limit = 30) {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  },

  async getUnreadCount(userId: string) {
    const rows = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return rows.length;
  },

  async markAsRead(userId: string, notificationId: string) {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
  },

  async markAllAsRead(userId: string) {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  },
};
