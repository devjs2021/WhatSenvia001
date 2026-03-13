import { FastifyRequest, FastifyReply } from "fastify";
import { BotBuilderService } from "../services/bot-builder.service.js";
import { AiConfigService } from "../services/ai-config.service.js";
import { createFlowSchema, updateFlowSchema, updateBotSettingsSchema, updateAiConfigSchema, testAiConnectionSchema, chatWithBotSchema } from "../schemas/bot-builder.schema.js";
import { success, error } from "../../../shared/utils/api-response.js";

const service = new BotBuilderService();
const aiService = new AiConfigService();

// Settings
export async function getSettings(request: FastifyRequest, reply: FastifyReply) {
  const settings = await service.getSettings((request as any).user.id);
  return success(reply, settings);
}

export async function updateSettings(request: FastifyRequest, reply: FastifyReply) {
  const parsed = updateBotSettingsSchema.safeParse(request.body);
  if (!parsed.success) return error(reply, parsed.error.errors[0].message, 422);
  const settings = await service.updateSettings((request as any).user.id, parsed.data);
  return success(reply, settings);
}

// Flows
export async function listFlows(request: FastifyRequest, reply: FastifyReply) {
  const flows = await service.listFlows((request as any).user.id);
  return success(reply, flows);
}

export async function listTemplates(request: FastifyRequest, reply: FastifyReply) {
  const templates = await service.listTemplates();
  return success(reply, templates);
}

export async function getFlow(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const flow = await service.getFlow((request as any).user.id, request.params.id);
  if (!flow) return error(reply, "Flow not found", 404);
  return success(reply, flow);
}

export async function createFlow(request: FastifyRequest, reply: FastifyReply) {
  const parsed = createFlowSchema.safeParse(request.body);
  if (!parsed.success) return error(reply, parsed.error.errors[0].message, 422);
  const flow = await service.createFlow((request as any).user.id, parsed.data);
  return success(reply, flow, 201);
}

export async function createFromTemplate(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as { templateId?: string; name?: string };
  if (!body?.templateId || !body?.name) return error(reply, "templateId and name required", 422);
  try {
    const flow = await service.createFromTemplate((request as any).user.id, body.templateId, body.name);
    return success(reply, flow, 201);
  } catch (err: any) {
    return error(reply, err.message);
  }
}

export async function updateFlow(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const parsed = updateFlowSchema.safeParse(request.body);
  if (!parsed.success) return error(reply, parsed.error.errors[0].message, 422);
  const flow = await service.updateFlow((request as any).user.id, request.params.id, parsed.data);
  if (!flow) return error(reply, "Flow not found", 404);
  return success(reply, flow);
}

export async function deleteFlow(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const deleted = await service.deleteFlow((request as any).user.id, request.params.id);
  if (!deleted) return error(reply, "Flow not found", 404);
  return success(reply, { deleted: true });
}

export async function duplicateFlow(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  try {
    const flow = await service.duplicateFlow((request as any).user.id, request.params.id);
    return success(reply, flow, 201);
  } catch (err: any) {
    return error(reply, err.message);
  }
}

export async function toggleFlowStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  try {
    const { sessionId } = (request.body as any) || {};
    const flow = await service.toggleFlowStatus((request as any).user.id, request.params.id, sessionId);
    return success(reply, flow);
  } catch (err: any) {
    return error(reply, err.message, 422);
  }
}

export async function getStats(request: FastifyRequest, reply: FastifyReply) {
  const stats = await service.getStats((request as any).user.id);
  return success(reply, stats);
}

// AI Config
export async function getAiConfig(request: FastifyRequest, reply: FastifyReply) {
  const config = await aiService.getConfig((request as any).user.id);
  return success(reply, config);
}

export async function updateAiConfig(request: FastifyRequest, reply: FastifyReply) {
  const parsed = updateAiConfigSchema.safeParse(request.body);
  if (!parsed.success) return error(reply, parsed.error.errors[0].message, 422);
  const config = await aiService.updateConfig((request as any).user.id, parsed.data);
  return success(reply, config);
}

export async function testAiConnection(request: FastifyRequest, reply: FastifyReply) {
  const parsed = testAiConnectionSchema.safeParse(request.body);
  if (!parsed.success) return error(reply, parsed.error.errors[0].message, 422);
  const result = await aiService.testConnection(parsed.data.provider, parsed.data.model, parsed.data.apiKey);
  return success(reply, result);
}

export async function getAiProviders(request: FastifyRequest, reply: FastifyReply) {
  return success(reply, aiService.getProviders());
}

export async function chatWithBot(request: FastifyRequest, reply: FastifyReply) {
  const parsed = chatWithBotSchema.safeParse(request.body);
  if (!parsed.success) return error(reply, parsed.error.errors[0].message, 422);
  try {
    const response = await aiService.chatWithBot((request as any).user.id, parsed.data.message);
    return success(reply, { response });
  } catch (err: any) {
    return error(reply, err.message);
  }
}
