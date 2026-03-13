import { pgTable, uuid, varchar, timestamp, text, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { whatsappSessions } from "./whatsapp-sessions";

// Poll campaigns - each time a user sends a poll
export const pollCampaigns = pgTable(
  "poll_campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => whatsappSessions.id, { onDelete: "set null" }),
    question: text("question").notNull(),
    options: jsonb("options").$type<string[]>().notNull(),
    multiSelect: boolean("multi_select").notNull().default(false),
    totalSent: integer("total_sent").default(0).notNull(),
    totalResponses: integer("total_responses").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("poll_campaigns_user_id_idx").on(table.userId),
    index("poll_campaigns_created_idx").on(table.createdAt),
  ]
);

// Track each sent poll message ID → campaign mapping (for matching votes to campaigns)
export const pollSentMessages = pgTable(
  "poll_sent_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pollCampaignId: uuid("poll_campaign_id").notNull().references(() => pollCampaigns.id, { onDelete: "cascade" }),
    phone: varchar("phone", { length: 20 }).notNull(),
    whatsappMessageId: varchar("whatsapp_message_id", { length: 100 }).notNull(),
    sentAt: timestamp("sent_at").defaultNow().notNull(),
  },
  (table) => [
    index("poll_sent_msg_campaign_idx").on(table.pollCampaignId),
    index("poll_sent_msg_wa_id_idx").on(table.whatsappMessageId),
  ]
);

// Individual poll responses from recipients
export const pollResponses = pgTable(
  "poll_responses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pollCampaignId: uuid("poll_campaign_id").notNull().references(() => pollCampaigns.id, { onDelete: "cascade" }),
    phone: varchar("phone", { length: 20 }).notNull(),
    selectedOptions: jsonb("selected_options").$type<string[]>().notNull(),
    whatsappMessageId: varchar("whatsapp_message_id", { length: 100 }),
    respondedAt: timestamp("responded_at").defaultNow().notNull(),
  },
  (table) => [
    index("poll_responses_campaign_idx").on(table.pollCampaignId),
    index("poll_responses_phone_idx").on(table.phone),
  ]
);
