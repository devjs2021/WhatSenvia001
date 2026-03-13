import { pgTable, uuid, varchar, timestamp, text, integer, jsonb } from "drizzle-orm/pg-core";

export const scheduledCampaigns = pgTable("scheduled_campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  message: text("message").notNull(),
  contactListId: uuid("contact_list_id"),
  contacts: jsonb("contacts").notNull().$type<Array<Record<string, string>>>(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending").$type<"pending" | "running" | "completed" | "cancelled" | "failed">(),
  totalContacts: integer("total_contacts").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  options: jsonb("options").$type<Record<string, any>>(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
