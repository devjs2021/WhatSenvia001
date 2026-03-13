import { pgTable, uuid, varchar, timestamp, text, integer, date } from "drizzle-orm/pg-core";

// Campaign control config (key-value store for settings)
export const campaignControlConfig = pgTable("campaign_control_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  configKey: varchar("config_key", { length: 50 }).notNull().unique(),
  configValue: text("config_value").notNull(), // JSON string
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Daily metrics tracking
export const campaignMetrics = pgTable("campaign_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: date("date").notNull().unique(),
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
