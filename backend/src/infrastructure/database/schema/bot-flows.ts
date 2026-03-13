import { pgTable, uuid, varchar, timestamp, text, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { whatsappSessions } from "./whatsapp-sessions";

export const botFlowStatusEnum = ["active", "inactive", "draft"] as const;
export type BotFlowStatus = (typeof botFlowStatusEnum)[number];

export const botModeEnum = ["ia_complete", "hybrid", "traditional"] as const;
export type BotMode = (typeof botModeEnum)[number];

// Bot settings per user
export const botSettings = pgTable("bot_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  mode: varchar("mode", { length: 20 }).notNull().default("hybrid").$type<BotMode>(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AI connection config per user
export const botAiConfig = pgTable("bot_ai_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  provider: varchar("provider", { length: 50 }).notNull().default("google"),
  model: varchar("model", { length: 100 }).notNull().default("gemini-2.0-flash-exp"),
  apiKey: text("api_key"),
  // Knowledge sections
  systemPrompt: text("system_prompt"),
  businessInfo: text("business_info"),
  faqs: text("faqs"),
  welcomeMessage: text("welcome_message"),
  temperature: varchar("temperature", { length: 10 }).default("0.7"),
  maxTokens: varchar("max_tokens", { length: 10 }).default("1000"),
  // Keywords and support
  activationKeywords: text("activation_keywords"),
  supportNumber: varchar("support_number", { length: 20 }),
  // RAG files stored as JSON array of { name, content }
  ragFiles: jsonb("rag_files").$type<{ name: string; content: string }[]>().default([]),
  ragEnabled: boolean("rag_enabled").notNull().default(false),
  // Bot active state
  botActive: boolean("bot_active").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Bot flows (each flow is a set of nodes and edges)
export const botFlows = pgTable(
  "bot_flows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 20 }).notNull().default("draft").$type<BotFlowStatus>(),
    isTemplate: boolean("is_template").notNull().default(false),
    sessionId: uuid("session_id").references(() => whatsappSessions.id, { onDelete: "set null" }),
    // Store nodes and edges as JSON (React Flow compatible format)
    nodes: jsonb("nodes").$type<any[]>().default([]),
    edges: jsonb("edges").$type<any[]>().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("bot_flows_user_id_idx").on(table.userId),
    index("bot_flows_status_idx").on(table.status),
  ]
);
