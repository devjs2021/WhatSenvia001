import { FastifyInstance } from "fastify";
import { authGuard, licenseGuard } from "../../../shared/middleware/auth.middleware.js";
import {
  listPollCampaigns,
  getPollResults,
  getPhonesByOption,
  deletePollCampaign,
} from "../controllers/poll.controller.js";

export async function pollRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  app.get("/", { preHandler: [licenseGuard("polls")] }, listPollCampaigns);
  app.get("/:id/results", getPollResults);
  app.get("/:id/phones", getPhonesByOption);
  app.delete("/:id", deletePollCampaign);
}
