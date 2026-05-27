import { FastifyInstance } from "fastify";
import { authGuard, licenseGuard } from "../../../shared/middleware/auth.middleware.js";
import { campaignControlService } from "../services/campaign-control.service.js";
import { campaignBroadcast } from "../websocket/campaign-broadcast.js";

export async function campaignControlRoutes(app: FastifyInstance) {
  app.get("/ws", { websocket: true }, async (socket, req) => {
    const token = (req.query as any).token;
    if (!token) {
      socket.close(4001, "Token required");
      return;
    }

    try {
      const decoded = app.jwt.verify<{ id: string }>(token);
      campaignBroadcast.addClient(socket, decoded.id);
    } catch {
      socket.close(4001, "Invalid token");
    }
  });

  app.get("/config", { preHandler: [authGuard, licenseGuard("campaignControl")] }, async () => {
    return campaignControlService.loadConfig();
  });

  app.put("/config", { preHandler: [authGuard, licenseGuard("campaignControl")] }, async (req) => {
    const config = req.body as any;
    await campaignControlService.saveConfig(config);
    return { success: true };
  });

  app.get("/metrics/today", { preHandler: [authGuard] }, async () => {
    return campaignControlService.getTodayMetrics();
  });

  app.post("/validate", { preHandler: [authGuard] }, async (req) => {
    const { totalContacts } = req.body as any;
    return campaignControlService.validateBeforeSending(totalContacts || 0);
  });

  app.post("/spintax-preview", { preHandler: [authGuard] }, async (req) => {
    const { message } = req.body as any;
    const config = await campaignControlService.loadConfig();
    if (!config.spintax.enabled) return { preview: message };
    const preview = campaignControlService.applySpintax(message, config);
    return { preview };
  });
}
