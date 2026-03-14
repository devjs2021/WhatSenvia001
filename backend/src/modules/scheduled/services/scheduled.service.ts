import { db } from "../../../config/database.js";
import { scheduledCampaigns } from "../../../infrastructure/database/schema/scheduled-campaigns.js";
import { and, eq, lte, desc } from "drizzle-orm";

export class ScheduledService {
  async create(data: {
    userId: string;
    sessionId: string;
    name: string;
    message: string;
    contacts: Array<Record<string, string>>;
    scheduledAt: Date;
    contactListId?: string;
    options?: Record<string, any>;
  }) {
    const [campaign] = await db
      .insert(scheduledCampaigns)
      .values({
        userId: data.userId,
        sessionId: data.sessionId,
        name: data.name,
        message: data.message,
        contacts: data.contacts,
        scheduledAt: data.scheduledAt,
        contactListId: data.contactListId || null,
        totalContacts: data.contacts.length,
        options: data.options || null,
      })
      .returning();

    return campaign;
  }

  async list(userId: string) {
    return db
      .select()
      .from(scheduledCampaigns)
      .where(eq(scheduledCampaigns.userId, userId))
      .orderBy(desc(scheduledCampaigns.scheduledAt));
  }

  async getById(id: string, userId: string) {
    const [campaign] = await db
      .select()
      .from(scheduledCampaigns)
      .where(and(eq(scheduledCampaigns.id, id), eq(scheduledCampaigns.userId, userId)))
      .limit(1);

    return campaign || null;
  }

  async cancel(id: string, userId: string) {
    const [updated] = await db
      .update(scheduledCampaigns)
      .set({ status: "cancelled" })
      .where(and(eq(scheduledCampaigns.id, id), eq(scheduledCampaigns.userId, userId)))
      .returning();

    return updated || null;
  }

  async delete(id: string, userId: string) {
    const [deleted] = await db
      .delete(scheduledCampaigns)
      .where(and(eq(scheduledCampaigns.id, id), eq(scheduledCampaigns.userId, userId)))
      .returning({ id: scheduledCampaigns.id });

    return deleted || null;
  }

  async getPending() {
    return db
      .select()
      .from(scheduledCampaigns)
      .where(
        and(
          eq(scheduledCampaigns.status, "pending"),
          lte(scheduledCampaigns.scheduledAt, new Date())
        )
      );
  }

  async markRunning(id: string) {
    const [updated] = await db
      .update(scheduledCampaigns)
      .set({ status: "running" })
      .where(eq(scheduledCampaigns.id, id))
      .returning();

    return updated || null;
  }

  async markCompleted(id: string, sent: number, failed: number) {
    const [updated] = await db
      .update(scheduledCampaigns)
      .set({
        status: "completed",
        sentCount: sent,
        failedCount: failed,
        completedAt: new Date(),
      })
      .where(eq(scheduledCampaigns.id, id))
      .returning();

    return updated || null;
  }

  async markFailed(id: string) {
    const [updated] = await db
      .update(scheduledCampaigns)
      .set({ status: "failed" })
      .where(eq(scheduledCampaigns.id, id))
      .returning();

    return updated || null;
  }
}

export const scheduledService = new ScheduledService();
