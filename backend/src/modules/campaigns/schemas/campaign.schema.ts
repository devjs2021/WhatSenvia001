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
});

export const updateCampaignSchema = createCampaignSchema.partial().omit({ sessionId: true });

export const queryCampaignsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  status: z.string().optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
