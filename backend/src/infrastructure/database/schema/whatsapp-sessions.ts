import { pgTable, uuid, varchar, timestamp, boolean, text, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const sessionStatusEnum = ["disconnected", "connecting", "connected", "qr_pending"] as const;
export type SessionStatus = (typeof sessionStatusEnum)[number];

export const connectionTypeEnum = ["baileys", "meta_cloud"] as const;
export type ConnectionType = (typeof connectionTypeEnum)[number];

export const whatsappSessions = pgTable(
  "whatsapp_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    status: varchar("status", { length: 20 }).notNull().default("disconnected").$type<SessionStatus>(),
    connectionType: varchar("connection_type", { length: 20 }).notNull().default("baileys").$type<ConnectionType>(),
    isDefault: boolean("is_default").default(false).notNull(),
    qrCode: text("qr_code"),
    wabaId: varchar("waba_id", { length: 100 }),
    metaPhoneNumberId: varchar("meta_phone_number_id", { length: 100 }),
    metaAccessToken: text("meta_access_token"),
    metaBusinessId: varchar("meta_business_id", { length: 100 }),
    metaTokenExpiresAt: timestamp("meta_token_expires_at"),
    isCoexistence: boolean("is_coexistence").default(false).notNull(),
    historySyncStatus: varchar("history_sync_status", { length: 20 }),
    lastConnectedAt: timestamp("last_connected_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("whatsapp_sessions_user_id_idx").on(table.userId),
  ]
);
