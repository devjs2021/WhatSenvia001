import { FastifyInstance } from "fastify";
import { authGuard, licenseGuard } from "../../../shared/middleware/auth.middleware.js";
import {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  startCampaign,
  pauseCampaign,
  getCampaignStats,
  createUnifiedCampaign,
  listUnifiedCampaigns,
  sendApprovedCampaign,
  downloadCampaignReport,
  cancelCampaign,
  cancelAllPending,
  getBatchRecommendation,
} from "../controllers/campaign.controller.js";
export async function campaignRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  app.get("/", listCampaigns);
  app.get("/unified", listUnifiedCampaigns);
  app.get("/batch-recommendation", getBatchRecommendation);
  app.get("/:id", getCampaign);
  app.get("/:id/stats", getCampaignStats);
  app.get("/:id/report", downloadCampaignReport);
  app.post("/", { preHandler: [licenseGuard("campaigns")] }, createCampaign);
  app.post("/unified", { preHandler: [licenseGuard("campaigns")] }, createUnifiedCampaign);
  app.put("/:id", updateCampaign);
  app.delete("/:id", deleteCampaign);
  app.post("/:id/start", { preHandler: [licenseGuard("campaigns")] }, startCampaign as any);
  app.post("/:id/send-approved", { preHandler: [licenseGuard("campaigns")] }, sendApprovedCampaign as any);
  app.post("/:id/pause", pauseCampaign);
  app.post("/:id/cancel", cancelCampaign);
  app.post("/cancel-all-pending", cancelAllPending);
}
