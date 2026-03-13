import { pgTable, uuid, varchar, timestamp, text, integer, jsonb, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { whatsappSessions } from "./whatsapp-sessions";

export const campaignStatusEnum = ["draft", "scheduled", "running", "paused", "completed", "failed"] as const;
export type CampaignStatus = (typeof campaignStatusEnum)[number];

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => whatsappSessions.id),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    message: text("message").notNull(),
    mediaUrl: varchar("media_url", { length: 500 }),
    mediaType: varchar("media_type", { length: 50 }),
    status: varchar("status", { length: 20 }).notNull().default("draft").$type<CampaignStatus>(),
    targetTags: jsonb("target_tags").$type<string[]>().default([]),
    totalContacts: integer("total_contacts").default(0).notNull(),
    sentCount: integer("sent_count").default(0).notNull(),
    deliveredCount: integer("delivered_count").default(0).notNull(),
    failedCount: integer("failed_count").default(0).notNull(),
    messagesPerMinute: integer("messages_per_minute").default(8).notNull(),
    scheduledAt: timestamp("scheduled_at"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("campaigns_user_id_idx").on(table.userId),
    index("campaigns_status_idx").on(table.status),
  ]
);
