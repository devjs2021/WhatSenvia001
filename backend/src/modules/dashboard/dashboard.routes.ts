import { FastifyInstance } from "fastify";
import { authGuard } from "../../shared/middleware/auth.middleware.js";
import { db } from "../../config/database.js";
import { contacts } from "../../infrastructure/database/schema/contacts.js";
import { campaigns } from "../../infrastructure/database/schema/campaigns.js";
import { messages } from "../../infrastructure/database/schema/messages.js";
import { whatsappSessions } from "../../infrastructure/database/schema/whatsapp-sessions.js";
import { eq, count, and, desc, sql } from "drizzle-orm";

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  app.get("/stats", async (request, reply) => {
    const userId = (request as any).user.id;

    const contactRows = await db.select({ total: count() }).from(contacts).where(eq(contacts.userId, userId));
    const campaignRows = await db.select({ total: count() }).from(campaigns).where(eq(campaigns.userId, userId));
    const sessionRows = await db.select({ total: count() }).from(whatsappSessions).where(eq(whatsappSessions.userId, userId));
    const connectedRows = await db
      .select({ total: count() })
      .from(whatsappSessions)
      .where(and(eq(whatsappSessions.userId, userId), eq(whatsappSessions.status, "connected")));

    const messageStatRows = await db
      .select({ status: messages.status, total: count() })
      .from(messages)
      .where(eq(messages.userId, userId))
      .groupBy(messages.status);

    const recentCampaigns = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        status: campaigns.status,
        sentCount: campaigns.sentCount,
        totalContacts: campaigns.totalContacts,
        createdAt: campaigns.createdAt,
      })
      .from(campaigns)
      .where(eq(campaigns.userId, userId))
      .orderBy(desc(campaigns.createdAt))
      .limit(5);

    const recentMessages = await db
      .select({
        id: messages.id,
        phone: messages.phone,
        content: messages.content,
        status: messages.status,
        sentAt: messages.sentAt,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(eq(messages.userId, userId))
      .orderBy(desc(messages.createdAt))
      .limit(10);

    let totalPolls = 0;
    let activeFlows = 0;
    try {
      const { pollCampaigns } = await import("../../infrastructure/database/schema/polls.js");
      const pollRows = await db.select({ total: count() }).from(pollCampaigns).where(eq(pollCampaigns.userId, userId));
      totalPolls = pollRows[0]?.total ?? 0;
    } catch {}

    try {
      const { botFlows } = await import("../../infrastructure/database/schema/bot-flows.js");
      const flowRows = await db.select({ total: count() }).from(botFlows).where(and(eq(botFlows.userId, userId), eq(botFlows.status, "active")));
      activeFlows = flowRows[0]?.total ?? 0;
    } catch {}

    const msgStats: Record<string, number> = {
      queued: 0, sending: 0, sent: 0, delivered: 0, read: 0, failed: 0,
    };
    let totalMessages = 0;
    for (const row of messageStatRows) {
      msgStats[row.status] = row.total;
      totalMessages += row.total;
    }

    return {
      success: true,
      data: {
        overview: {
          totalContacts: contactRows[0]?.total ?? 0,
          totalCampaigns: campaignRows[0]?.total ?? 0,
          totalMessages,
          totalSessions: sessionRows[0]?.total ?? 0,
          connectedSessions: connectedRows[0]?.total ?? 0,
          totalPolls,
          activeFlows,
        },
        messageStats: msgStats,
        recentCampaigns,
        recentMessages,
      },
    };
  });

  // GET /api/dashboard/weekly
  app.get("/weekly", async (request) => {
    const userId = (request as any).user.id;
    const result = await db.execute(sql`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM messages
      WHERE created_at >= NOW() - INTERVAL '7 days'
        AND user_id = ${userId}
      GROUP BY DATE(created_at)
      ORDER BY date
    `);
    return { success: true, data: result.rows };
  });

  // GET /api/dashboard/sessions
  app.get("/sessions", async (request) => {
    const userId = (request as any).user.id;
    const sessions = await db
      .select({
        id: whatsappSessions.id,
        name: whatsappSessions.name,
        phone: whatsappSessions.phone,
        status: whatsappSessions.status,
        lastConnectedAt: whatsappSessions.lastConnectedAt,
      })
      .from(whatsappSessions)
      .where(eq(whatsappSessions.userId, userId))
      .orderBy(desc(whatsappSessions.lastConnectedAt));
    return { success: true, data: sessions };
  });
}
