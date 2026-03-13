import { FastifyRequest, FastifyReply } from "fastify";
import { CampaignService } from "../services/campaign.service.js";
import { createCampaignSchema, updateCampaignSchema, queryCampaignsSchema } from "../schemas/campaign.schema.js";
import { success, error, paginated } from "../../../shared/utils/api-response.js";

const campaignService = new CampaignService();

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

export async function getCampaignStats(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const userId = (request as any).user.id;
  const stats = await campaignService.getStats(userId, request.params.id);
  if (!stats) return error(reply, "Campaign not found", 404);
  return success(reply, stats);
}
