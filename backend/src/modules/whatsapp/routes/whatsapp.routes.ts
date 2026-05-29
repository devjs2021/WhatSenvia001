import { FastifyInstance } from "fastify";
import { authGuard } from "../../../shared/middleware/auth.middleware.js";
import {
  listSessions,
  createSession,
  connectSession,
  disconnectSession,
  getSessionStatus,
  deleteSession,
} from "../controllers/whatsapp.controller.js";
import { getWhatsAppProvider } from "../../../infrastructure/whatsapp/whatsapp.factory.js";
import { chatService } from "../../chat/services/chat.service.js";
import { db } from "../../../config/database.js";
import { verificationJobs } from "../../../infrastructure/database/schema/verification-jobs.js";
import { verificationQueue } from "../../../infrastructure/queue/verification.queue.js";
import { eq, and } from "drizzle-orm";

export async function whatsappRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  app.get("/sessions", listSessions);
  app.post("/sessions", createSession);
  app.post("/sessions/:id/connect", connectSession);
  app.post("/sessions/:id/disconnect", disconnectSession);
  app.get("/sessions/:id/status", getSessionStatus);
  app.delete("/sessions/:id", deleteSession);

  // --- Test send ---
  app.post("/test-send", async (req) => {
    const { sessionId, phone, message } = req.body as { sessionId: string; phone: string; message: string };
    const userId = (req as any).user.id;
    try {
      const provider = await getWhatsAppProvider(sessionId);
      const result = await provider.sendMessage(sessionId, { phone: phone.replace(/\D/g, ""), message });
      if (result.success) {
        await chatService.saveMessage({
          sessionId,
          phone: phone.replace(/\D/g, ""),
          content: message,
          direction: "outgoing",
          senderType: "human",
          whatsappMessageId: result.messageId,
        });
      }
      return {
        success: result.success,
        message: result.success ? `Mensaje enviado a ${phone}` : (result.error || "Error al enviar"),
        messageId: result.messageId,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return { success: false, message: err.message, timestamp: new Date().toISOString() };
    }
  });

  // --- Contact extraction & number verification ---

  app.get("/sessions/:id/groups", async (req) => {
    const { id } = req.params as { id: string };
    const provider = await getWhatsAppProvider(id);
    return provider.getGroups(id);
  });

  app.post("/sessions/:id/group-contacts", async (req) => {
    const { id } = req.params as { id: string };
    const { groupIds } = req.body as { groupIds: string[] };
    const provider = await getWhatsAppProvider(id);
    const allContacts = new Map<string, { phone: string; isAdmin: boolean }>();
    for (const groupId of groupIds) {
      const participants = await provider.getGroupParticipants(id, groupId);
      for (const p of participants) {
        if (!allContacts.has(p.phone)) {
          allContacts.set(p.phone, p);
        }
      }
    }
    return Array.from(allContacts.values());
  });

  app.post("/sessions/:id/extract-contacts", async (req) => {
    const { id } = req.params as { id: string };
    const provider = await getWhatsAppProvider(id);
    const groups = await provider.getGroups(id);
    const contactsMap = new Map<string, { phone: string; name?: string; pushName?: string; isBusiness?: boolean; isMyContact?: boolean }>();
    for (const group of groups) {
      try {
        const participants = await provider.getGroupParticipants(id, group.id);
        for (const p of participants) {
          if (!contactsMap.has(p.phone)) {
            contactsMap.set(p.phone, { phone: p.phone });
          }
        }
      } catch {}
    }
    return { contacts: Array.from(contactsMap.values()) };
  });

  app.post("/sessions/:id/check-number", async (req) => {
    const { id } = req.params as { id: string };
    const { phone } = req.body as { phone: string };
    const provider = await getWhatsAppProvider(id);
    return provider.checkNumberExists(id, phone);
  });

  app.post("/sessions/:id/check-numbers", async (req) => {
    const { id } = req.params as { id: string };
    const { phones } = req.body as { phones: string[] };
    const provider = await getWhatsAppProvider(id);
    const results = [];
    for (const phone of phones) {
      try {
        const result = await provider.checkNumberExists(id, phone);
        results.push({ phone, ...result });
        await new Promise((r) => setTimeout(r, 200));
      } catch {
        results.push({ phone, exists: false });
      }
    }
    return results;
  });

  // Background verification
  app.post("/verify-bulk", async (req, reply) => {
    const userId = (req as any).user.id;
    const { sessionId, phones } = req.body as { sessionId: string; phones: string[] };

    if (!sessionId || !phones?.length) {
      return reply.status(422).send({ error: "sessionId and phones are required" });
    }

    const cleanPhones = phones.map((p) => p.replace(/\D/g, "")).filter((p) => p.length >= 10);

    const [job] = await db
      .insert(verificationJobs)
      .values({
        userId,
        sessionId,
        phones: cleanPhones,
        totalCount: cleanPhones.length,
      })
      .returning();

    await verificationQueue.add(`verify-${job.id}`, {
      jobId: job.id,
      sessionId,
    });

    return { success: true, data: { id: job.id, totalCount: cleanPhones.length } };
  });

  app.get("/verify-bulk/:id", async (req, reply) => {
    const userId = (req as any).user.id;
    const { id } = req.params as { id: string };

    const [job] = await db
      .select()
      .from(verificationJobs)
      .where(and(eq(verificationJobs.id, id), eq(verificationJobs.userId, userId)))
      .limit(1);

    if (!job) return reply.status(404).send({ error: "Job not found" });

    return {
      success: true,
      data: {
        id: job.id,
        status: job.status,
        totalCount: job.totalCount,
        checkedCount: job.checkedCount,
        validPhones: job.validPhones,
        invalidPhones: job.invalidPhones,
        error: job.error,
      },
    };
  });
}
