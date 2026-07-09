import { pgTable, uuid, varchar, timestamp, index, unique } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Correos adicionales a los que se les copia en notificaciones del sistema
 * (cambio de estado de plantillas Meta, campañas finalizadas, vencimiento de
 * licencia). Siempre se suman al correo de la cuenta — nunca lo reemplazan.
 */
export const notificationEmails = pgTable(
  "notification_emails",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notification_emails_user_id_idx").on(table.userId),
    unique("notification_emails_user_id_email").on(table.userId, table.email),
  ]
);
