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
} from "../controllers/campaign.controller.js";
export async function campaignRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  app.get("/", listCampaigns);
  app.get("/:id", getCampaign);
  app.get("/:id/stats", getCampaignStats);
  app.post("/", { preHandler: [licenseGuard("campaigns")] }, createCampaign);
  app.put("/:id", updateCampaign);
  app.delete("/:id", deleteCampaign);
  app.post("/:id/start", { preHandler: [licenseGuard("campaigns")] }, startCampaign as any);
  app.post("/:id/pause", pauseCampaign);
}
