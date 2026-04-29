import { pgTable, uuid, varchar, timestamp, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }),
  role: varchar("role", { length: 20 }).notNull().default("user"), // "admin" | "user"
  facebookId: varchar("facebook_id", { length: 255 }).unique(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
