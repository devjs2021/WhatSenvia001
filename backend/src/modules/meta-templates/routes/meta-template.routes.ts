import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authGuard } from "../../../shared/middleware/auth.middleware.js";
import { MetaTemplateService } from "../services/meta-template.service.js";

const service = new MetaTemplateService();

export async function metaTemplateRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  app.post("/sync", async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const { sessionId } = request.body as { sessionId: string };

    if (!sessionId) {
      return reply.status(400).send({ error: "sessionId is required" });
    }

    try {
      const result = await service.syncTemplates(userId, sessionId);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const { sessionId } = request.query as { sessionId: string };

    if (!sessionId) {
      return reply.status(400).send({ error: "sessionId query param is required" });
    }

    try {
      const templates = await service.listTemplates(userId, sessionId);
      return reply.send({ success: true, data: templates });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });
}
