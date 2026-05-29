import { z } from "zod";

export const createCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  description: z.string().optional(),
  message: z.string().min(1, "Message is required"),
  mediaUrl: z.string().url().optional(),
  mediaType: z.enum(["image", "video", "audio", "document"]).optional(),
  targetTags: z.array(z.string()).optional().default([]),
  sessionId: z.string().uuid("Invalid session ID"),
  messagesPerMinute: z.number().int().min(1).max(30).optional().default(8),
  scheduledAt: z.string().datetime().optional(),
  isTemplateCampaign: z.boolean().optional().default(false),
  metaTemplateId: z.string().uuid().optional(),
  templateParams: z.record(z.array(z.string())).optional(),
});

export const updateCampaignSchema = createCampaignSchema.partial().omit({ sessionId: true });

export const queryCampaignsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  status: z.string().optional(),
});

export const createUnifiedCampaignSchema = z.object({
  sessionId: z.string().uuid(),
  name: z.string().min(1),
  contacts: z.array(z.record(z.string())).min(1, "At least one contact is required"),
  templateName: z.string().min(1).regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, underscores"),
  templateCategory: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]),
  templateLanguage: z.string().min(1),
  templateComponents: z.array(z.any()).min(1),
  templateParams: z.record(z.array(z.string())).optional(),
  messagesPerMinute: z.number().int().min(1).max(30).optional().default(8),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type CreateUnifiedCampaignInput = z.infer<typeof createUnifiedCampaignSchema>;
