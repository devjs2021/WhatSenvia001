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

export async function whatsappRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  app.get("/sessions", listSessions);
  app.post("/sessions", createSession);
  app.post("/sessions/:id/connect", connectSession);
  app.post("/sessions/:id/disconnect", disconnectSession);
  app.get("/sessions/:id/status", getSessionStatus);
  app.delete("/sessions/:id", deleteSession);

  // --- Contact extraction & number verification ---

  app.get("/sessions/:id/groups", async (req) => {
    const { id } = req.params as { id: string };
    const provider = getWhatsAppProvider();
    return provider.getGroups(id);
  });

  app.post("/sessions/:id/group-contacts", async (req) => {
    const { id } = req.params as { id: string };
    const { groupIds } = req.body as { groupIds: string[] };
    const provider = getWhatsAppProvider();
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

  app.post("/sessions/:id/check-number", async (req) => {
    const { id } = req.params as { id: string };
    const { phone } = req.body as { phone: string };
    const provider = getWhatsAppProvider();
    return provider.checkNumberExists(id, phone);
  });

  app.post("/sessions/:id/check-numbers", async (req) => {
    const { id } = req.params as { id: string };
    const { phones } = req.body as { phones: string[] };
    const provider = getWhatsAppProvider();
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
}
