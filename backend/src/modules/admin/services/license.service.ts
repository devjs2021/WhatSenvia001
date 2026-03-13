import { db } from "../../../config/database.js";
import { licenses, LICENSE_PLANS, type LicenseFeatures } from "../../../infrastructure/database/schema/licenses.js";
import { users } from "../../../infrastructure/database/schema/users.js";
import { contacts } from "../../../infrastructure/database/schema/contacts.js";
import { whatsappSessions } from "../../../infrastructure/database/schema/whatsapp-sessions.js";
import { campaigns } from "../../../infrastructure/database/schema/campaigns.js";
import { messages } from "../../../infrastructure/database/schema/messages.js";
import { eq, and, count, gte, sql } from "drizzle-orm";

export class LicenseService {
  // Get active license for a user
  async getActiveLicense(userId: string) {
    const [license] = await db
      .select()
      .from(licenses)
      .where(and(eq(licenses.userId, userId), eq(licenses.status, "active")))
      .limit(1);

    if (!license) return null;

    // Auto-expire if past date
    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      await db
        .update(licenses)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(licenses.id, license.id));
      return { ...license, status: "expired" as const };
    }

    return license;
  }

  // List all licenses (admin)
  async listAll() {
    return db
      .select({
        id: licenses.id,
        userId: licenses.userId,
        userName: users.name,
        userEmail: users.email,
        plan: licenses.plan,
        status: licenses.status,
        startsAt: licenses.startsAt,
        expiresAt: licenses.expiresAt,
        maxSessions: licenses.maxSessions,
        maxContacts: licenses.maxContacts,
        maxCampaignsPerDay: licenses.maxCampaignsPerDay,
        maxMessagesPerDay: licenses.maxMessagesPerDay,
        features: licenses.features,
        notes: licenses.notes,
        createdAt: licenses.createdAt,
      })
      .from(licenses)
      .leftJoin(users, eq(licenses.userId, users.id))
      .orderBy(licenses.createdAt);
  }

  // List licenses for a specific user
  async listByUser(userId: string) {
    return db
      .select()
      .from(licenses)
      .where(eq(licenses.userId, userId))
      .orderBy(licenses.createdAt);
  }

  // Create license from a preset plan
  async createFromPlan(
    userId: string,
    plan: keyof typeof LICENSE_PLANS,
    createdBy: string,
    options?: { durationDays?: number; notes?: string }
  ) {
    const preset = LICENSE_PLANS[plan];
    const durationDays = options?.durationDays || preset.durationDays;

    // Deactivate any existing active license
    await db
      .update(licenses)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(licenses.userId, userId), eq(licenses.status, "active")));

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    const [license] = await db
      .insert(licenses)
      .values({
        userId,
        plan,
        status: "active",
        startsAt: new Date(),
        expiresAt,
        maxSessions: preset.maxSessions,
        maxContacts: preset.maxContacts,
        maxCampaignsPerDay: preset.maxCampaignsPerDay,
        maxMessagesPerDay: preset.maxMessagesPerDay,
        features: preset.features,
        notes: options?.notes,
        createdBy,
      })
      .returning();

    return license;
  }

  // Create a fully custom license
  async createCustom(
    userId: string,
    createdBy: string,
    data: {
      plan?: string;
      durationDays?: number | null; // null = unlimited
      maxSessions: number;
      maxContacts: number;
      maxCampaignsPerDay: number;
      maxMessagesPerDay: number;
      features: LicenseFeatures;
      notes?: string;
    }
  ) {
    // Deactivate any existing active license
    await db
      .update(licenses)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(licenses.userId, userId), eq(licenses.status, "active")));

    const expiresAt = data.durationDays
      ? new Date(Date.now() + data.durationDays * 86400000)
      : null;

    const [license] = await db
      .insert(licenses)
      .values({
        userId,
        plan: data.plan || "custom",
        status: "active",
        startsAt: new Date(),
        expiresAt,
        maxSessions: data.maxSessions,
        maxContacts: data.maxContacts,
        maxCampaignsPerDay: data.maxCampaignsPerDay,
        maxMessagesPerDay: data.maxMessagesPerDay,
        features: data.features,
        notes: data.notes,
        createdBy,
      })
      .returning();

    return license;
  }

  // Update an existing license
  async update(
    licenseId: string,
    data: {
      plan?: string;
      status?: string;
      expiresAt?: Date | null;
      maxSessions?: number;
      maxContacts?: number;
      maxCampaignsPerDay?: number;
      maxMessagesPerDay?: number;
      features?: LicenseFeatures;
      notes?: string;
    }
  ) {
    const [updated] = await db
      .update(licenses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(licenses.id, licenseId))
      .returning();

    return updated || null;
  }

  // Suspend a license
  async suspend(licenseId: string) {
    return this.update(licenseId, { status: "suspended" });
  }

  // Reactivate a suspended license
  async reactivate(licenseId: string) {
    return this.update(licenseId, { status: "active" });
  }

  // Delete a license
  async delete(licenseId: string) {
    const [deleted] = await db
      .delete(licenses)
      .where(eq(licenses.id, licenseId))
      .returning({ id: licenses.id });
    return !!deleted;
  }

  // Check limits for a user
  async checkLimits(userId: string) {
    const license = await this.getActiveLicense(userId);
    if (!license) return { allowed: false, reason: "No active license" };

    // Count current resources
    const [contactCount] = await db
      .select({ total: count() })
      .from(contacts)
      .where(eq(contacts.userId, userId));

    const [sessionCount] = await db
      .select({ total: count() })
      .from(whatsappSessions)
      .where(eq(whatsappSessions.userId, userId));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [campaignsToday] = await db
      .select({ total: count() })
      .from(campaigns)
      .where(and(eq(campaigns.userId, userId), gte(campaigns.createdAt, today)));

    const [messagesToday] = await db
      .select({ total: count() })
      .from(messages)
      .where(and(eq(messages.userId, userId), gte(messages.createdAt, today)));

    return {
      allowed: true,
      license: {
        plan: license.plan,
        expiresAt: license.expiresAt,
        features: license.features as LicenseFeatures,
      },
      usage: {
        contacts: { used: contactCount.total, max: license.maxContacts },
        sessions: { used: sessionCount.total, max: license.maxSessions },
        campaignsToday: { used: campaignsToday.total, max: license.maxCampaignsPerDay },
        messagesToday: { used: messagesToday.total, max: license.maxMessagesPerDay },
      },
    };
  }

  // Get available plans (for self-registration)
  getPlans() {
    return Object.entries(LICENSE_PLANS).map(([key, value]) => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      ...value,
    }));
  }
}

export const licenseService = new LicenseService();
