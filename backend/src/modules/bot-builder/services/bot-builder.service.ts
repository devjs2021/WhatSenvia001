import { db } from "../../../config/database.js";
import { botFlows, botSettings } from "../../../infrastructure/database/schema/bot-flows.js";
import { eq, and, desc, count } from "drizzle-orm";
import type { CreateFlowInput, UpdateFlowInput, UpdateBotSettingsInput } from "../schemas/bot-builder.schema.js";

export class BotBuilderService {
  // === Bot Settings ===
  async getSettings(userId: string) {
    const [settings] = await db
      .select()
      .from(botSettings)
      .where(eq(botSettings.userId, userId))
      .limit(1);

    if (!settings) {
      // Create default settings
      const [created] = await db
        .insert(botSettings)
        .values({ userId, mode: "hybrid", enabled: true })
        .returning();
      return created;
    }
    return settings;
  }

  async updateSettings(userId: string, input: UpdateBotSettingsInput) {
    const existing = await this.getSettings(userId);
    const [updated] = await db
      .update(botSettings)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(botSettings.id, existing.id))
      .returning();
    return updated;
  }

  // === Flows ===
  async listFlows(userId: string) {
    const flows = await db
      .select()
      .from(botFlows)
      .where(and(eq(botFlows.userId, userId), eq(botFlows.isTemplate, false)))
      .orderBy(desc(botFlows.updatedAt));
    return flows;
  }

  async listTemplates() {
    const templates = await db
      .select()
      .from(botFlows)
      .where(eq(botFlows.isTemplate, true))
      .orderBy(desc(botFlows.createdAt));
    return templates;
  }

  async getFlow(userId: string, flowId: string) {
    const [flow] = await db
      .select()
      .from(botFlows)
      .where(and(eq(botFlows.id, flowId), eq(botFlows.userId, userId)))
      .limit(1);
    return flow || null;
  }

  async createFlow(userId: string, input: CreateFlowInput) {
    const [flow] = await db
      .insert(botFlows)
      .values({
        userId,
        name: input.name,
        description: input.description,
        nodes: input.nodes,
        edges: input.edges,
        status: "draft",
      })
      .returning();
    return flow;
  }

  async createFromTemplate(userId: string, templateId: string, name: string) {
    // Get template (templates can have any userId, so just check isTemplate)
    const [template] = await db
      .select()
      .from(botFlows)
      .where(and(eq(botFlows.id, templateId), eq(botFlows.isTemplate, true)))
      .limit(1);

    if (!template) throw new Error("Template not found");

    const [flow] = await db
      .insert(botFlows)
      .values({
        userId,
        name,
        description: template.description,
        nodes: template.nodes,
        edges: template.edges,
        status: "draft",
      })
      .returning();
    return flow;
  }

  async updateFlow(userId: string, flowId: string, input: UpdateFlowInput) {
    const [flow] = await db
      .update(botFlows)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(botFlows.id, flowId), eq(botFlows.userId, userId)))
      .returning();
    return flow || null;
  }

  async deleteFlow(userId: string, flowId: string) {
    const [deleted] = await db
      .delete(botFlows)
      .where(and(eq(botFlows.id, flowId), eq(botFlows.userId, userId)))
      .returning({ id: botFlows.id });
    return !!deleted;
  }

  async duplicateFlow(userId: string, flowId: string) {
    const original = await this.getFlow(userId, flowId);
    if (!original) throw new Error("Flow not found");

    const [flow] = await db
      .insert(botFlows)
      .values({
        userId,
        name: `${original.name} (copia)`,
        description: original.description,
        nodes: original.nodes,
        edges: original.edges,
        status: "draft",
      })
      .returning();
    return flow;
  }

  async toggleFlowStatus(userId: string, flowId: string, sessionId?: string) {
    const flow = await this.getFlow(userId, flowId);
    if (!flow) throw new Error("Flow not found");

    const newStatus = flow.status === "active" ? "inactive" : "active";

    // When activating, require a sessionId
    if (newStatus === "active" && !sessionId && !flow.sessionId) {
      throw new Error("Debes seleccionar un numero de WhatsApp para activar el flujo");
    }

    const [updated] = await db
      .update(botFlows)
      .set({
        status: newStatus,
        ...(sessionId && { sessionId }),
        ...(newStatus === "inactive" && { sessionId: null }),
        updatedAt: new Date(),
      })
      .where(eq(botFlows.id, flowId))
      .returning();
    return updated;
  }

  async getStats(userId: string) {
    const flows = await this.listFlows(userId);
    const active = flows.filter((f) => f.status === "active").length;
    return { total: flows.length, active, inactive: flows.length - active };
  }
}
