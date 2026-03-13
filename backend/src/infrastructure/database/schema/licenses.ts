import { pgTable, uuid, varchar, timestamp, boolean, integer, jsonb, text } from "drizzle-orm/pg-core";
import { users } from "./users";

export const licenses = pgTable("licenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  plan: varchar("plan", { length: 50 }).notNull().default("demo"), // demo | basic | pro | enterprise | custom
  status: varchar("status", { length: 20 }).notNull().default("active"), // active | expired | suspended | cancelled
  startsAt: timestamp("starts_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // null = unlimited
  // Limits
  maxSessions: integer("max_sessions").notNull().default(1),
  maxContacts: integer("max_contacts").notNull().default(100),
  maxCampaignsPerDay: integer("max_campaigns_per_day").notNull().default(2),
  maxMessagesPerDay: integer("max_messages_per_day").notNull().default(100),
  // Feature toggles
  features: jsonb("features").notNull().default({
    campaigns: true,
    botBuilder: false,
    chatLive: true,
    polls: false,
    scheduledCampaigns: false,
    contactExtraction: false,
    import: true,
    reports: false,
    templates: true,
    campaignControl: false,
  }),
  // Admin notes
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Type for feature toggles
export interface LicenseFeatures {
  campaigns: boolean;
  botBuilder: boolean;
  chatLive: boolean;
  polls: boolean;
  scheduledCampaigns: boolean;
  contactExtraction: boolean;
  import: boolean;
  reports: boolean;
  templates: boolean;
  campaignControl: boolean;
}

// Preset plans
export const LICENSE_PLANS = {
  demo: {
    maxSessions: 1,
    maxContacts: 50,
    maxCampaignsPerDay: 1,
    maxMessagesPerDay: 50,
    durationDays: 7,
    features: {
      campaigns: true,
      botBuilder: false,
      chatLive: true,
      polls: false,
      scheduledCampaigns: false,
      contactExtraction: false,
      import: true,
      reports: false,
      templates: true,
      campaignControl: false,
    },
  },
  basic: {
    maxSessions: 1,
    maxContacts: 500,
    maxCampaignsPerDay: 5,
    maxMessagesPerDay: 500,
    durationDays: 30,
    features: {
      campaigns: true,
      botBuilder: false,
      chatLive: true,
      polls: true,
      scheduledCampaigns: true,
      contactExtraction: true,
      import: true,
      reports: true,
      templates: true,
      campaignControl: false,
    },
  },
  pro: {
    maxSessions: 3,
    maxContacts: 5000,
    maxCampaignsPerDay: 20,
    maxMessagesPerDay: 5000,
    durationDays: 30,
    features: {
      campaigns: true,
      botBuilder: true,
      chatLive: true,
      polls: true,
      scheduledCampaigns: true,
      contactExtraction: true,
      import: true,
      reports: true,
      templates: true,
      campaignControl: true,
    },
  },
  enterprise: {
    maxSessions: 10,
    maxContacts: 50000,
    maxCampaignsPerDay: 100,
    maxMessagesPerDay: 50000,
    durationDays: 30,
    features: {
      campaigns: true,
      botBuilder: true,
      chatLive: true,
      polls: true,
      scheduledCampaigns: true,
      contactExtraction: true,
      import: true,
      reports: true,
      templates: true,
      campaignControl: true,
    },
  },
} as const;
