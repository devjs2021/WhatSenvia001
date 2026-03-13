import { z } from "zod";

export const createFlowSchema = z.object({
  name: z.string().min(1, "Flow name is required"),
  description: z.string().optional(),
  nodes: z.array(z.any()).optional().default([]),
  edges: z.array(z.any()).optional().default([]),
});

export const updateFlowSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["active", "inactive", "draft"]).optional(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
});

export const updateBotSettingsSchema = z.object({
  mode: z.enum(["ia_complete", "hybrid", "traditional"]),
  enabled: z.boolean().optional(),
});

export const updateAiConfigSchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  apiKey: z.string().optional(),
  systemPrompt: z.string().optional(),
  businessInfo: z.string().optional(),
  faqs: z.string().optional(),
  welcomeMessage: z.string().optional(),
  temperature: z.string().optional(),
  maxTokens: z.string().optional(),
  activationKeywords: z.string().optional(),
  supportNumber: z.string().optional(),
  ragFiles: z.array(z.object({ name: z.string(), content: z.string() })).optional(),
  ragEnabled: z.boolean().optional(),
  botActive: z.boolean().optional(),
});

export const testAiConnectionSchema = z.object({
  provider: z.string(),
  model: z.string(),
  apiKey: z.string().min(1, "API Key is required"),
});

export const chatWithBotSchema = z.object({
  message: z.string().min(1),
});

export type CreateFlowInput = z.infer<typeof createFlowSchema>;
export type UpdateFlowInput = z.infer<typeof updateFlowSchema>;
export type UpdateBotSettingsInput = z.infer<typeof updateBotSettingsSchema>;
export type UpdateAiConfigInput = z.infer<typeof updateAiConfigSchema>;
