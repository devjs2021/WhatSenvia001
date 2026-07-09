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

  app.post("/create", async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const { sessionId, name, category, language, components } = request.body as {
      sessionId: string;
      name: string;
      category: string;
      language: string;
      components: any[];
    };

    if (!sessionId || !name || !category || !language || !components?.length) {
      return reply.status(400).send({ error: "sessionId, name, category, language, and components are required" });
    }

    if (!/^[a-z0-9_]+$/.test(name)) {
      return reply.status(400).send({ error: "Template name must contain only lowercase letters, numbers, and underscores" });
    }

    try {
      const result = await service.createTemplate(userId, sessionId, { name, category, language, components });
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const { sessionId } = request.query as { sessionId?: string };

    try {
      const templates = sessionId
        ? await service.listTemplates(userId, sessionId)
        : await service.listAllTemplates(userId);
      return reply.send({ success: true, data: templates });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });
}
