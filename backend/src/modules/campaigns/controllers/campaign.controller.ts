import { FastifyRequest, FastifyReply } from "fastify";
import { CampaignService } from "../services/campaign.service.js";
import { createCampaignSchema, updateCampaignSchema, queryCampaignsSchema, createUnifiedCampaignSchema } from "../schemas/campaign.schema.js";
import { success, error, paginated } from "../../../shared/utils/api-response.js";
import { recommendBatches } from "../services/batch-recommendation.service.js";
import { db } from "../../../config/database.js";
import { whatsappSessions } from "../../../infrastructure/database/schema/whatsapp-sessions.js";
import { eq, and } from "drizzle-orm";

const campaignService = new CampaignService();

export async function getBatchRecommendation(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).user.id;
  const { sessionId, totalContacts } = request.query as { sessionId?: string; totalContacts?: string };

  const total = parseInt(totalContacts || "", 10);
  if (!sessionId || !total || total < 1) {
    return error(reply, "sessionId y totalContacts son requeridos", 422);
  }

  const [session] = await db
    .select({ messagingLimit: whatsappSessions.messagingLimit })
    .from(whatsappSessions)
    .where(and(eq(whatsappSessions.id, sessionId), eq(whatsappSessions.userId, userId)))
    .limit(1);

  if (!session) return error(reply, "Sesión no encontrada", 404);

  const recommendation = recommendBatches(total, session.messagingLimit);
  return success(reply, recommendation);
}

export async function listCampaigns(request: FastifyRequest, reply: FastifyReply) {
  const parsed = queryCampaignsSchema.safeParse(request.query);
  if (!parsed.success) return error(reply, parsed.error.errors[0].message, 422);

  const userId = (request as any).user.id;
  const { page, limit, status } = parsed.data;
  const { data, total } = await campaignService.list(userId, page, limit, status);
  return paginated(reply, data, total, page, limit);
}

export async function getCampaign(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const userId = (request as any).user.id;
  const campaign = await campaignService.getById(userId, request.params.id);
  if (!campaign) return error(reply, "Campaign not found", 404);
  return success(reply, campaign);
}

export async function createCampaign(request: FastifyRequest, reply: FastifyReply) {
  const parsed = createCampaignSchema.safeParse(request.body);
  if (!parsed.success) return error(reply, parsed.error.errors[0].message, 422);

  const userId = (request as any).user.id;
  const campaign = await campaignService.create(userId, parsed.data);
  return success(reply, campaign, 201);
}

export async function updateCampaign(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const parsed = updateCampaignSchema.safeParse(request.body);
  if (!parsed.success) return error(reply, parsed.error.errors[0].message, 422);

  const userId = (request as any).user.id;
  const campaign = await campaignService.update(userId, request.params.id, parsed.data);
  if (!campaign) return error(reply, "Campaign not found", 404);
  return success(reply, campaign);
}

export async function deleteCampaign(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const userId = (request as any).user.id;
  const deleted = await campaignService.delete(userId, request.params.id);
  if (!deleted) return error(reply, "Campaign not found", 404);
  return success(reply, { deleted: true });
}

export async function startCampaign(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  try {
    const userId = (request as any).user.id;
    const result = await campaignService.start(userId, request.params.id);
    return success(reply, result);
  } catch (err: any) {
    return error(reply, err.message);
  }
}

export async function pauseCampaign(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const userId = (request as any).user.id;
  const campaign = await campaignService.pause(userId, request.params.id);
  if (!campaign) return error(reply, "Campaign not found", 404);
  return success(reply, campaign);
}

export async function cancelCampaign(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const userId = (request as any).user.id;
  try {
    const campaign = await campaignService.cancel(userId, request.params.id);
    if (!campaign) return error(reply, "Campaign not found", 404);
    return success(reply, campaign);
  } catch (err: any) {
    return error(reply, err.message);
  }
}

export async function cancelAllPending(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).user.id;
  try {
    const result = await campaignService.cancelAllPending(userId);
    return success(reply, result);
  } catch (err: any) {
    return error(reply, err.message);
  }
}

export async function getCampaignStats(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const userId = (request as any).user.id;
  const stats = await campaignService.getStats(userId, request.params.id);
  if (!stats) return error(reply, "Campaign not found", 404);
  return success(reply, stats);
}

export async function downloadCampaignReport(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const userId = (request as any).user.id;
  const result = await campaignService.generateReport(userId, request.params.id);
  if (!result) return error(reply, "Campaign not found", 404);

  const safeName = result.campaign.name.replace(/[^a-zA-Z0-9_-]+/g, "_") || "campana";
  reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  reply.header("Content-Disposition", `attachment; filename="reporte-${safeName}.xlsx"`);
  return reply.send(result.buffer);
}

export async function createUnifiedCampaign(request: FastifyRequest, reply: FastifyReply) {
  const parsed = createUnifiedCampaignSchema.safeParse(request.body);
  if (!parsed.success) return error(reply, parsed.error.errors[0].message, 422);

  try {
    const userId = (request as any).user.id;
    const result = await campaignService.createUnified(userId, parsed.data);
    return success(reply, result, 201);
  } catch (err: any) {
    return error(reply, err.message);
  }
}

export async function listUnifiedCampaigns(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).user.id;
  const data = await campaignService.listUnified(userId);
  return success(reply, data);
}

export async function sendApprovedCampaign(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  try {
    const userId = (request as any).user.id;
    const result = await campaignService.sendApproved(userId, request.params.id);
    return success(reply, result);
  } catch (err: any) {
    return error(reply, err.message);
  }
}
