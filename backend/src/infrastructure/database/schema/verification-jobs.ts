import { pgTable, uuid, varchar, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const verificationJobs = pgTable("verification_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending").$type<"pending" | "running" | "completed" | "failed">(),
  phones: jsonb("phones").notNull().$type<string[]>(),
  validPhones: jsonb("valid_phones").$type<string[]>().default([]),
  invalidPhones: jsonb("invalid_phones").$type<string[]>().default([]),
  totalCount: integer("total_count").notNull().default(0),
  checkedCount: integer("checked_count").notNull().default(0),
  error: varchar("error", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});
