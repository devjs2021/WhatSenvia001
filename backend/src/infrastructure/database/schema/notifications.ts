import { pgTable, uuid, varchar, timestamp, text, boolean, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const notificationTypeEnum = ["new_chat", "campaign_completed", "campaign_failed", "system_error", "campaign_scheduled", "quality_alert"] as const;
export type NotificationType = (typeof notificationTypeEnum)[number];

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull().$type<NotificationType>(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body"),
    metadata: text("metadata"),
    read: boolean("read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_notifications_user").on(table.userId),
    index("idx_notifications_user_read").on(table.userId, table.read),
  ]
);
