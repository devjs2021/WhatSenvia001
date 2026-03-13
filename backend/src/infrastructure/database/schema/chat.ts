import { pgTable, uuid, varchar, timestamp, text, index } from "drizzle-orm/pg-core";

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id").notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    remoteJid: varchar("remote_jid", { length: 100 }),
    content: text("content").notNull(),
    direction: varchar("direction", { length: 10 }).notNull().$type<"incoming" | "outgoing">(),
    senderType: varchar("sender_type", { length: 10 }).notNull().$type<"user" | "bot" | "human">(),
    whatsappMessageId: varchar("whatsapp_message_id", { length: 100 }),
    pushName: varchar("push_name", { length: 255 }),
    status: varchar("status", { length: 20 }).default("sent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("chat_messages_session_phone_idx").on(table.sessionId, table.phone),
    index("chat_messages_created_at_idx").on(table.createdAt),
  ]
);
