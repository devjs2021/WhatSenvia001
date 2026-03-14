import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authGuard, licenseGuard } from "../../../shared/middleware/auth.middleware.js";
import { scheduledService } from "../services/scheduled.service.js";

export async function scheduledRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  app.get("/", async (request: FastifyRequest) => {
    const userId = (request as any).user.id as string;
    const data = await scheduledService.list(userId);
    return { success: true, data };
  });

  app.get("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = (request as any).user.id as string;
    const campaign = await scheduledService.getById(id, userId);
    if (!campaign) return reply.status(404).send({ error: "Campaña programada no encontrada" });
    return { success: true, data: campaign };
  });

  app.post("/", { preHandler: [licenseGuard("scheduledCampaigns")] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user.id as string;
    const { sessionId, name, message, contacts, scheduledAt, contactListId, options } = request.body as {
      sessionId: string;
      name: string;
      message: string;
      contacts: Array<Record<string, string>>;
      scheduledAt: string;
      contactListId?: string;
      options?: Record<string, any>;
    };

    if (!sessionId?.trim()) return reply.status(422).send({ error: "sessionId es obligatorio" });
    if (!name?.trim()) return reply.status(422).send({ error: "Nombre es obligatorio" });
    if (!message?.trim()) return reply.status(422).send({ error: "Mensaje es obligatorio" });
    if (!contacts || contacts.length === 0) return reply.status(422).send({ error: "Se requiere al menos un contacto" });
    if (!scheduledAt) return reply.status(422).send({ error: "Fecha programada es obligatoria" });

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) return reply.status(422).send({ error: "Fecha invalida" });
    if (scheduledDate <= new Date()) return reply.status(422).send({ error: "La fecha debe ser en el futuro" });

    const campaign = await scheduledService.create({
      userId,
      sessionId,
      name: name.trim(),
      message,
      contacts,
      scheduledAt: scheduledDate,
      contactListId,
      options,
    });

    return { success: true, data: campaign };
  });

  app.post("/:id/cancel", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = (request as any).user.id as string;
    const campaign = await scheduledService.getById(id, userId);
    if (!campaign) return reply.status(404).send({ error: "Campaña no encontrada" });
    if (campaign.status !== "pending") return reply.status(422).send({ error: "Solo se pueden cancelar campañas pendientes" });

    const updated = await scheduledService.cancel(id, userId);
    return { success: true, data: updated };
  });

  app.delete("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = (request as any).user.id as string;
    const deleted = await scheduledService.delete(id, userId);
    if (!deleted) return reply.status(404).send({ error: "Campaña no encontrada" });
    return { success: true };
  });
}
