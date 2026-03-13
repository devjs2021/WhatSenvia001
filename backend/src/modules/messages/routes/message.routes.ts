import { FastifyInstance } from "fastify";
import { authGuard } from "../../../shared/middleware/auth.middleware.js";
import { listMessages, sendMessage, sendQuickMessage, getMessageStats, sendPoll, sendPollBulk } from "../controllers/message.controller.js";
export async function messageRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  app.get("/", listMessages);
  app.get("/stats", getMessageStats);
  app.post("/send", sendMessage);
  app.post("/send-quick", sendQuickMessage);
  app.post("/send-poll", sendPoll);
  app.post("/send-poll-bulk", sendPollBulk);
}
