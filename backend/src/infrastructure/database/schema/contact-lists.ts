import { pgTable, uuid, varchar, timestamp, integer, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const contactLists = pgTable(
  "contact_lists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: varchar("description", { length: 500 }),
    contactCount: integer("contact_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("contact_lists_user_id_idx").on(table.userId),
  ]
);

export const contactListMembers = pgTable(
  "contact_list_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listId: uuid("list_id").notNull().references(() => contactLists.id, { onDelete: "cascade" }),
    phone: varchar("phone", { length: 20 }).notNull(),
    name: varchar("name", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("contact_list_members_list_id_idx").on(table.listId),
    index("contact_list_members_phone_idx").on(table.phone),
  ]
);
