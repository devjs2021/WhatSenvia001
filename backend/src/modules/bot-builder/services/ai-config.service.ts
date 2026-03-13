import { db } from "../../../config/database.js";
import { botAiConfig } from "../../../infrastructure/database/schema/bot-flows.js";
import { eq } from "drizzle-orm";
import type { UpdateAiConfigInput } from "../schemas/bot-builder.schema.js";

const AI_PROVIDERS: Record<string, { name: string; models: { id: string; name: string }[] }> = {
  google: {
    name: "Google Gemini (GRATIS)",
    models: [
      { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash (Exp)" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
    ],
  },
  openai: {
    name: "OpenAI",
    models: [
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
    ],
  },
  anthropic: {
    name: "Anthropic",
    models: [
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },
    ],
  },
};

export class AiConfigService {
  async getConfig(userId: string) {
    const [config] = await db
      .select()
      .from(botAiConfig)
      .where(eq(botAiConfig.userId, userId))
      .limit(1);

    if (!config) {
      const [created] = await db
        .insert(botAiConfig)
        .values({ userId })
        .returning();
      return created;
    }
    return config;
  }

  async updateConfig(userId: string, input: UpdateAiConfigInput) {
    const existing = await this.getConfig(userId);
    const [updated] = await db
      .update(botAiConfig)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(botAiConfig.id, existing.id))
      .returning();
    return updated;
  }

  async testConnection(provider: string, model: string, apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      if (provider === "google") {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Responde solo: OK" }] }],
          }),
        });
        if (!res.ok) {
          const err = await res.json() as any;
          throw new Error(err.error?.message || `HTTP ${res.status}`);
        }
        return { success: true, message: "Conexion exitosa con Google Gemini" };
      }

      if (provider === "openai") {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: "Responde solo: OK" }],
            max_tokens: 5,
          }),
        });
        if (!res.ok) {
          const err = await res.json() as any;
          throw new Error(err.error?.message || `HTTP ${res.status}`);
        }
        return { success: true, message: "Conexion exitosa con OpenAI" };
      }

      if (provider === "anthropic") {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: 5,
            messages: [{ role: "user", content: "Responde solo: OK" }],
          }),
        });
        if (!res.ok) {
          const err = await res.json() as any;
          throw new Error(err.error?.message || `HTTP ${res.status}`);
        }
        return { success: true, message: "Conexion exitosa con Anthropic" };
      }

      return { success: false, message: "Proveedor no soportado" };
    } catch (err: any) {
      return { success: false, message: err.message || "Error de conexion" };
    }
  }

  async chatWithBot(userId: string, userMessage: string): Promise<string> {
    const config = await this.getConfig(userId);
    if (!config.apiKey) throw new Error("No hay API Key configurada");
    if (!config.botActive) throw new Error("El bot esta inactivo");

    const systemPrompt = config.systemPrompt || "Eres un asistente virtual amable y util.";

    // Build full context from all knowledge sections
    const contextParts: string[] = [];
    if (config.businessInfo) contextParts.push(`[Informacion del negocio]:\n${config.businessInfo}`);
    if (config.faqs) contextParts.push(`[Preguntas frecuentes]:\n${config.faqs}`);
    if (config.ragEnabled) {
      const ragContext = (config.ragFiles as any[] || [])
        .map((f: { name: string; content: string }) => `[${f.name}]:\n${f.content}`)
        .join("\n\n");
      if (ragContext) contextParts.push(ragContext);
    }

    const fullSystemPrompt = contextParts.length > 0
      ? `${systemPrompt}\n\nUsa la siguiente informacion como contexto para responder:\n\n${contextParts.join("\n\n")}`
      : systemPrompt;

    if (config.provider === "google") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: fullSystemPrompt }] },
          contents: [{ parts: [{ text: userMessage }] }],
          generationConfig: {
            temperature: parseFloat(config.temperature || "0.7"),
            maxOutputTokens: parseInt(config.maxTokens || "1000"),
          },
        }),
      });
      if (!res.ok) throw new Error(`Google API error: ${res.status}`);
      const data = await res.json() as any;
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta";
    }

    if (config.provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: fullSystemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: parseFloat(config.temperature || "0.7"),
          max_tokens: parseInt(config.maxTokens || "1000"),
        }),
      });
      if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
      const data = await res.json() as any;
      return data.choices?.[0]?.message?.content || "Sin respuesta";
    }

    if (config.provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.model,
          system: fullSystemPrompt,
          max_tokens: parseInt(config.maxTokens || "1000"),
          messages: [{ role: "user", content: userMessage }],
        }),
      });
      if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
      const data = await res.json() as any;
      return data.content?.[0]?.text || "Sin respuesta";
    }

    throw new Error("Proveedor no soportado");
  }

  getProviders() {
    return AI_PROVIDERS;
  }
}
