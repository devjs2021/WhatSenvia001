import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authGuard } from "../../../shared/middleware/auth.middleware.js";
import { notificationEmailService } from "../services/notification-email.service.js";
import { success, error } from "../../../shared/utils/api-response.js";

export async function notificationEmailRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const emails = await notificationEmailService.list(userId);
    return success(reply, emails);
  });

  app.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const { email } = request.body as { email?: string };

    if (!email || !email.trim()) {
      return error(reply, "El correo es requerido", 422);
    }

    try {
      const created = await notificationEmailService.add(userId, email);
      return success(reply, created, 201);
    } catch (err: any) {
      return error(reply, err.message, 400);
    }
  });

  app.delete("/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const deleted = await notificationEmailService.remove(userId, request.params.id);
    if (!deleted) return error(reply, "Correo no encontrado", 404);
    return success(reply, { deleted: true });
  });
}
