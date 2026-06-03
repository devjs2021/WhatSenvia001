import { pgTable, uuid, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { users } from "./users";

export const chatReadCursors = pgTable(
  "chat_read_cursors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    phone: varchar("phone", { length: 20 }).notNull(),
    lastReadAt: timestamp("last_read_at").defaultNow().notNull(),
  },
  (table) => [
    unique("chat_read_cursors_user_phone").on(table.userId, table.phone),
  ]
);
