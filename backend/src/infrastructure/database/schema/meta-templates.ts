import { pgTable, uuid, varchar, jsonb, timestamp, index, unique } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const metaTemplates = pgTable("meta_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  wabaId: varchar("waba_id", { length: 100 }).notNull(),
  metaTemplateId: varchar("meta_template_id", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 30 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  language: varchar("language", { length: 10 }).notNull(),
  components: jsonb("components").default([]),
  lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("meta_templates_user_id_idx").on(table.userId),
  unique("meta_templates_waba_template_lang").on(table.wabaId, table.metaTemplateId, table.language),
]);
