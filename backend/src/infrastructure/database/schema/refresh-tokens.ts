import { pgTable, uuid, text, timestamp, varchar, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  userAgent: varchar("user_agent", { length: 500 }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("refresh_tokens_user_id_idx").on(table.userId),
  index("refresh_tokens_token_idx").on(table.token),
]);
