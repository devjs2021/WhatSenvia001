import { FastifyInstance } from "fastify";
import { authGuard, licenseGuard } from "../../../shared/middleware/auth.middleware.js";
import {
  getSettings,
  updateSettings,
  listFlows,
  listTemplates,
  getFlow,
  createFlow,
  createFromTemplate,
  updateFlow,
  deleteFlow,
  duplicateFlow,
  toggleFlowStatus,
  getStats,
  getAiConfig,
  updateAiConfig,
  testAiConnection,
  getAiProviders,
  chatWithBot,
} from "../controllers/bot-builder.controller.js";

export async function botBuilderRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  // Bot settings
  app.get("/settings", getSettings);
  app.put("/settings", updateSettings);

  // Stats
  app.get("/stats", getStats);

  // Templates
  app.get("/templates", listTemplates);
  app.post("/from-template", { preHandler: [licenseGuard("botBuilder")] }, createFromTemplate);

  // Flows CRUD
  app.get("/flows", listFlows);
  app.get("/flows/:id", getFlow);
  app.post("/flows", { preHandler: [licenseGuard("botBuilder")] }, createFlow);
  app.put("/flows/:id", updateFlow);
  app.delete("/flows/:id", deleteFlow);
  app.post("/flows/:id/duplicate", duplicateFlow);
  app.post("/flows/:id/toggle", toggleFlowStatus);

  // AI Config
  app.get("/ai-config", getAiConfig);
  app.put("/ai-config", updateAiConfig);
  app.post("/ai-config/test", testAiConnection);
  app.get("/ai-config/providers", getAiProviders);
  app.post("/ai-config/chat", chatWithBot);
}
