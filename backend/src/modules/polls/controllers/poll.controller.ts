import { FastifyRequest, FastifyReply } from "fastify";
import { PollService } from "../services/poll.service.js";
import { success, error } from "../../../shared/utils/api-response.js";

const service = new PollService();

export async function listPollCampaigns(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).user.id;
  const campaigns = await service.listCampaigns(userId);
  return success(reply, campaigns);
}

export async function getPollResults(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const results = await service.getCampaignResults(request.params.id);
  if (!results) return error(reply, "Poll campaign not found", 404);
  return success(reply, results);
}

export async function getPhonesByOption(
  request: FastifyRequest<{ Params: { id: string }; Querystring: { option: string } }>,
  reply: FastifyReply
) {
  const option = (request.query as any).option;
  if (!option) return error(reply, "option query param required", 422);
  const phones = await service.getPhonesByOption(request.params.id, option);
  return success(reply, phones);
}

export async function deletePollCampaign(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const deleted = await service.deleteCampaign(request.params.id);
  if (!deleted) return error(reply, "Poll campaign not found", 404);
  return success(reply, { deleted: true });
}
