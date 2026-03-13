import { FastifyRequest, FastifyReply } from "fastify";
import { MessageService } from "../services/message.service.js";
import { PollService } from "../../polls/services/poll.service.js";
import { success, error, paginated } from "../../../shared/utils/api-response.js";
import { getWhatsAppProvider } from "../../../infrastructure/whatsapp/whatsapp.factory.js";
import { z } from "zod";

const messageService = new MessageService();
const pollService = new PollService();

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  campaignId: z.string().uuid().optional(),
});

const sendSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
  contactId: z.string().uuid("Invalid contact ID"),
  content: z.string().min(1, "Message content is required"),
  mediaUrl: z.string().url().optional(),
  mediaType: z.enum(["image", "video", "audio", "document"]).optional(),
});

const sendQuickSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
  phone: z.string().min(7, "Phone number is required"),
  content: z.string().min(1, "Message content is required"),
  mediaUrl: z.string().url().optional(),
  mediaType: z.enum(["image", "video", "audio", "document"]).optional(),
});

export async function listMessages(request: FastifyRequest, reply: FastifyReply) {
  const parsed = querySchema.safeParse(request.query);
  if (!parsed.success) return error(reply, parsed.error.errors[0].message, 422);

  const userId = (request as any).user.id;
  const { page, limit, campaignId } = parsed.data;
  const { data, total } = await messageService.list(userId, page, limit, campaignId);
  return paginated(reply, data, total, page, limit);
}

export async function sendMessage(request: FastifyRequest, reply: FastifyReply) {
  const parsed = sendSchema.safeParse(request.body);
  if (!parsed.success) return error(reply, parsed.error.errors[0].message, 422);

  try {
    const userId = (request as any).user.id;
    const msg = await messageService.sendDirect(
      userId,
      parsed.data.sessionId,
      parsed.data.contactId,
      parsed.data.content,
      parsed.data.mediaUrl,
      parsed.data.mediaType
    );
    return success(reply, msg, 201);
  } catch (err: any) {
    return error(reply, err.message);
  }
}

export async function sendQuickMessage(request: FastifyRequest, reply: FastifyReply) {
  const parsed = sendQuickSchema.safeParse(request.body);
  if (!parsed.success) return error(reply, parsed.error.errors[0].message, 422);

  try {
    const userId = (request as any).user.id;
    const msg = await messageService.sendQuick(
      userId,
      parsed.data.sessionId,
      parsed.data.phone,
      parsed.data.content,
      parsed.data.mediaUrl,
      parsed.data.mediaType
    );
    return success(reply, msg, 201);
  } catch (err: any) {
    return error(reply, err.message);
  }
}

export async function getMessageStats(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).user.id;
  const stats = await messageService.getStats(userId);
  return success(reply, stats);
}

export async function sendPoll(request: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({
    sessionId: z.string().uuid(),
    phone: z.string().min(10),
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(12),
    multiSelect: z.boolean().optional().default(false),
  });

  const parsed = schema.safeParse(request.body);
  if (!parsed.success) return error(reply, parsed.error.errors[0].message, 422);

  try {
    const { sessionId, phone, question, options, multiSelect } = parsed.data;
    const provider = getWhatsAppProvider();
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const msgId = await provider.sendPoll(sessionId, cleanPhone, question, options, multiSelect ? options.length : 1);
    return success(reply, { messageId: msgId, phone: cleanPhone, type: "poll" }, 201);
  } catch (err: any) {
    return error(reply, err.message);
  }
}

export async function sendPollBulk(request: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({
    sessionId: z.string().uuid(),
    phones: z.array(z.string().min(10)).min(1),
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(12),
    multiSelect: z.boolean().optional().default(false),
  });

  const parsed = schema.safeParse(request.body);
  if (!parsed.success) return error(reply, parsed.error.errors[0].message, 422);

  try {
    const { sessionId, phones, question, options, multiSelect } = parsed.data;
    const provider = getWhatsAppProvider();
    const validOptions = options.filter((o) => o.trim());
    const userId = (request as any).user.id;

    const campaign = await pollService.createPollCampaign({
      userId,
      sessionId,
      question,
      options: validOptions,
      multiSelect,
      totalSent: phones.length,
    });

    let sent = 0;
    let failed = 0;
    for (const phone of phones) {
      try {
        const cleanPhone = phone.replace(/[^0-9]/g, "");
        const msgId = await provider.sendPoll(sessionId, cleanPhone, question, validOptions, multiSelect ? validOptions.length : 1);
        if (msgId) {
          await pollService.recordSentMessage(campaign.id, cleanPhone, msgId);
        }
        sent++;
      } catch {
        failed++;
      }
    }

    return success(reply, {
      campaignId: campaign.id,
      totalSent: sent,
      totalFailed: failed,
      type: "poll_bulk",
    }, 201);
  } catch (err: any) {
    return error(reply, err.message);
  }
}
