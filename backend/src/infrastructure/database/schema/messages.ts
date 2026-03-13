import { pgTable, uuid, varchar, timestamp, text, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { contacts } from "./contacts";
import { campaigns } from "./campaigns";

export const messageStatusEnum = ["queued", "sending", "sent", "delivered", "read", "failed"] as const;
export type MessageStatus = (typeof messageStatusEnum)[number];

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    phone: varchar("phone", { length: 20 }).notNull(),
    content: text("content").notNull(),
    mediaUrl: varchar("media_url", { length: 500 }),
    mediaType: varchar("media_type", { length: 50 }),
    status: varchar("status", { length: 20 }).notNull().default("queued").$type<MessageStatus>(),
    whatsappMessageId: varchar("whatsapp_message_id", { length: 100 }),
    errorMessage: text("error_message"),
    sentAt: timestamp("sent_at"),
    deliveredAt: timestamp("delivered_at"),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("messages_user_id_idx").on(table.userId),
    index("messages_campaign_id_idx").on(table.campaignId),
    index("messages_status_idx").on(table.status),
    index("messages_contact_id_idx").on(table.contactId),
  ]
);
