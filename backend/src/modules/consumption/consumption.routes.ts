import { FastifyInstance } from "fastify";
import { authGuard } from "../../shared/middleware/auth.middleware.js";
import { db } from "../../config/database.js";
import { messages } from "../../infrastructure/database/schema/messages.js";
import { campaigns } from "../../infrastructure/database/schema/campaigns.js";
import { contacts } from "../../infrastructure/database/schema/contacts.js";
import { metaTemplates } from "../../infrastructure/database/schema/meta-templates.js";
import { whatsappSessions } from "../../infrastructure/database/schema/whatsapp-sessions.js";
import { eq, and, sql, gte, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  estimateCampaignCost,
  getCategoryFromTemplate,
  getCountryFromPhone,
  getConversationRate,
  type ConversationCategory,
} from "./meta-pricing.js";

export async function consumptionRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  // GET /api/consumption/stats — monthly consumption summary
  app.get("/stats", async (request) => {
    const userId = (request as any).user.id;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get all messages sent this month via meta_cloud sessions
    const metaSessions = await db
      .select({ id: whatsappSessions.id })
      .from(whatsappSessions)
      .where(and(
        eq(whatsappSessions.userId, userId),
        eq(whatsappSessions.connectionType, "meta_cloud"),
      ));

    const metaSessionIds = metaSessions.map((s) => s.id);

    if (metaSessionIds.length === 0) {
      return {
        success: true,
        data: {
          totalCost: 0,
          totalConversations: 0,
          breakdown: { marketing: { count: 0, cost: 0 }, utility: { count: 0, cost: 0 }, authentication: { count: 0, cost: 0 }, service: { count: 0, cost: 0 } },
          byCountry: {},
          period: { from: monthStart.toISOString(), to: now.toISOString() },
        },
      };
    }

    // Get sent messages from meta sessions this month
    const sentMessages = await db
      .select({
        phone: messages.phone,
        estimatedCost: messages.estimatedCost,
        conversationCategory: messages.conversationCategory,
      })
      .from(messages)
      .innerJoin(campaigns, eq(messages.campaignId, campaigns.id))
      .where(
        and(
          eq(messages.userId, userId),
          inArray(messages.status, ["sent", "delivered", "read"]),
          gte(messages.sentAt, monthStart),
          inArray(campaigns.sessionId, metaSessionIds)
        )
      );

    let totalCost = 0;
    let totalConversations = 0;
    const byCategory: Record<string, { count: number; cost: number }> = {
      marketing: { count: 0, cost: 0 },
      utility: { count: 0, cost: 0 },
      authentication: { count: 0, cost: 0 },
      service: { count: 0, cost: 0 },
    };
    const byCountry: Record<string, { count: number; cost: number }> = {};

    for (const row of sentMessages) {
      const cost = parseFloat(row.estimatedCost || "0") || 0;
      const category = row.conversationCategory || "service";
      const country = getCountryFromPhone(row.phone);

      totalCost += cost;
      totalConversations += 1;

      if (byCategory[category]) {
        byCategory[category].count += 1;
        byCategory[category].cost += cost;
      }

      if (!byCountry[country]) byCountry[country] = { count: 0, cost: 0 };
      byCountry[country].count += 1;
      byCountry[country].cost += cost;
    }

    // Round costs
    totalCost = Math.round(totalCost * 10000) / 10000;
    for (const k of Object.keys(byCategory)) {
      byCategory[k].cost = Math.round(byCategory[k].cost * 10000) / 10000;
    }
    for (const k of Object.keys(byCountry)) {
      byCountry[k].cost = Math.round(byCountry[k].cost * 10000) / 10000;
    }

    return {
      success: true,
      data: {
        totalCost,
        totalConversations,
        breakdown: byCategory,
        byCountry,
        period: { from: monthStart.toISOString(), to: now.toISOString() },
      },
    };
  });

  // POST /api/consumption/estimate — pre-send cost estimate
  app.post("/estimate", async (request) => {
    const userId = (request as any).user.id;

    const schema = z.object({
      templateId: z.string().uuid().optional(),
      category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]).optional(),
      contactCount: z.number().int().positive().optional(),
      tags: z.array(z.string()).optional(),
    });

    const body = schema.parse(request.body);

    // Determine category
    let category: ConversationCategory = "marketing";
    if (body.templateId) {
      const [tpl] = await db
        .select({ category: metaTemplates.category })
        .from(metaTemplates)
        .where(and(eq(metaTemplates.id, body.templateId), eq(metaTemplates.userId, userId)))
        .limit(1);
      if (tpl) category = getCategoryFromTemplate(tpl.category);
    } else if (body.category) {
      category = getCategoryFromTemplate(body.category);
    }

    // Get contact phones
    let phones: string[] = [];
    if (body.tags && body.tags.length > 0) {
      const taggedContacts = await db.execute(sql`
        SELECT phone FROM contacts
        WHERE user_id = ${userId}
          AND tags ?| ${body.tags}
      `);
      phones = (taggedContacts.rows as any[]).map((r) => r.phone);
    } else {
      const allContacts = await db
        .select({ phone: contacts.phone })
        .from(contacts)
        .where(eq(contacts.userId, userId));
      phones = allContacts.map((c) => c.phone);
    }

    if (body.contactCount && body.contactCount < phones.length) {
      phones = phones.slice(0, body.contactCount);
    }

    const estimate = estimateCampaignCost(phones, category);

    return {
      success: true,
      data: {
        category,
        contactCount: phones.length,
        estimatedCost: estimate.totalCost,
        breakdown: estimate.breakdown,
        currency: "USD",
        note: "Estimado basado en tarifas de Meta por conversación. El costo real puede variar.",
      },
    };
  });
}
