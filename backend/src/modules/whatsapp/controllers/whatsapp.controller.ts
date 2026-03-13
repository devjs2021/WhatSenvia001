import { FastifyRequest, FastifyReply } from "fastify";
import { WhatsAppService } from "../services/whatsapp.service.js";
import { success, error } from "../../../shared/utils/api-response.js";
import { z } from "zod";

const whatsappService = new WhatsAppService();

const createSessionSchema = z.object({
  name: z.string().min(1, "Session name is required"),
});

export async function listSessions(request: FastifyRequest, reply: FastifyReply) {
  const sessions = await whatsappService.listSessions();
  return success(reply, sessions);
}

export async function createSession(request: FastifyRequest, reply: FastifyReply) {
  const parsed = createSessionSchema.safeParse(request.body);
  if (!parsed.success) return error(reply, parsed.error.errors[0].message, 422);

  const session = await whatsappService.createSession((request as any).user.id, parsed.data.name);
  return success(reply, session, 201);
}

export async function connectSession(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const result = await whatsappService.connectSession(request.params.id);
    return success(reply, result);
  } catch (err: any) {
    return error(reply, err.message);
  }
}

export async function disconnectSession(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const result = await whatsappService.disconnectSession(request.params.id);
    return success(reply, result);
  } catch (err: any) {
    return error(reply, err.message);
  }
}

export async function getSessionStatus(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const status = await whatsappService.getSessionStatus(request.params.id);
    return success(reply, status);
  } catch (err: any) {
    return error(reply, err.message, 404);
  }
}

export async function deleteSession(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const deleted = await whatsappService.deleteSession(request.params.id);
    if (!deleted) return error(reply, "Session not found", 404);
    return success(reply, { deleted: true });
  } catch (err: any) {
    return error(reply, err.message);
  }
}
