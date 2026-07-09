import type {
  IWhatsAppProvider,
  SendMessageOptions,
  SendMessageResult,
  WhatsAppConnectionEvents,
} from "../interfaces/whatsapp-provider.interface.js";
import { logger } from "../../../config/logger.js";
import { env } from "../../../config/env.js";
import { metaRateLimiter } from "./meta-rate-limiter.js";

/**
 * Meta Cloud API Provider
 *
 * Uses the official WhatsApp Cloud API via Meta's Graph API.
 * Each instance is configured with its own access token and phone number ID
 * (per-session, not global env vars).
 */
// Sin esto, una llamada a Meta que nunca responde (caída de red, Meta lento)
// se queda colgada para siempre. Como los mensajes se procesan de a uno a la
// vez en todo el sistema, un solo request colgado bloqueaba la fila completa
// para todos los usuarios — ningún otro mensaje volvía a salir.
const META_REQUEST_TIMEOUT_MS = 30_000;

export class MetaCloudProvider implements IWhatsAppProvider {
  readonly providerName = "meta-cloud";
  private readonly baseUrl = "https://graph.facebook.com/v21.0";
  readonly accessToken: string;
  readonly phoneNumberId: string;
  private displayPhone: string;

  constructor(accessToken: string, phoneNumberId: string, displayPhone?: string) {
    this.accessToken = accessToken;
    this.phoneNumberId = phoneNumberId;
    this.displayPhone = displayPhone || "";
  }

  async connect(_sessionId: string, events: WhatsAppConnectionEvents): Promise<void> {
    if (!this.displayPhone) {
      try {
        const res = await fetch(`${this.baseUrl}/${this.phoneNumberId}?fields=display_phone_number`, {
          headers: { Authorization: `Bearer ${this.accessToken}` },
          signal: AbortSignal.timeout(META_REQUEST_TIMEOUT_MS),
        });
        const data: any = await res.json();
        if (data.display_phone_number) {
          this.displayPhone = data.display_phone_number;
        }
      } catch {}
    }
    events.onConnected(this.displayPhone || this.phoneNumberId);
    logger.info("Meta Cloud API provider connected");
  }

  async disconnect(_sessionId: string): Promise<void> {
    logger.info("Meta Cloud API provider disconnected");
  }

  isConnected(_sessionId: string): boolean {
    return !!this.accessToken && !!this.phoneNumberId;
  }

  async sendMessage(_sessionId: string, options: SendMessageOptions): Promise<SendMessageResult> {
    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
      const to = options.phone.replace(/[^0-9]/g, "");

      let body: Record<string, any>;

      if (options.template) {
        body = {
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: options.template.name,
            language: { code: options.template.language },
            components: options.template.components
              .filter((c) => c.parameters.length > 0)
              .map((c) => ({
                type: c.type,
                parameters: c.parameters,
              })),
          },
        };
      } else {
        body = {
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: options.message },
        };

        if (options.mediaUrl && options.mediaType) {
          // Resolve relative URLs to absolute URLs (Meta needs a publicly accessible URL)
          let resolvedUrl = options.mediaUrl;
          if (resolvedUrl.startsWith("/")) {
            const baseUrl = env.APP_URL.replace(/\/+$/, "");
            resolvedUrl = `${baseUrl}${resolvedUrl}`;
          }

          logger.info({ mediaUrl: options.mediaUrl, resolvedUrl, appUrl: env.APP_URL }, "[META MEDIA] URL resuelta");

          body.type = options.mediaType;
          body[options.mediaType] = {
            link: resolvedUrl,
            caption: options.message,
          };
          delete body.text;
        }
      }

      // Respeta la velocidad configurada (META_RATE_LIMIT_MPS) antes de llamar a Meta.
      await metaRateLimiter.acquire();

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(META_REQUEST_TIMEOUT_MS),
      });

      const data: any = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          metaRateLimiter.reportThrottled();
        }
        return { success: false, error: data.error?.message || "Meta API error" };
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
      };
    } catch (error: any) {
      logger.error({ error: error.message }, "Meta Cloud API send failed");
      return { success: false, error: error.message };
    }
  }

  getSessionInfo(_sessionId: string): { phone?: string; status: string } | null {
    return {
      phone: this.displayPhone || this.phoneNumberId,
      status: this.isConnected("") ? "connected" : "disconnected",
    };
  }

  async sendPoll(_sessionId: string, _phone: string, _pollName: string, _options: string[], _selectableCount?: number): Promise<string> {
    throw new Error("Polls are not supported by Meta Cloud API");
  }

  async getGroups(_sessionId: string): Promise<Array<{ id: string; subject: string; participantsCount: number }>> {
    throw new Error("Group extraction is not supported by Meta Cloud API");
  }

  async getGroupParticipants(_sessionId: string, _groupId: string): Promise<Array<{ phone: string; isAdmin: boolean }>> {
    throw new Error("Group extraction is not supported by Meta Cloud API");
  }

  async checkNumberExists(_sessionId: string, _phone: string): Promise<{ exists: boolean; jid?: string }> {
    throw new Error("Number verification is not supported by Meta Cloud API");
  }

  async sendPresenceUpdate(_sessionId: string, type: "composing" | "paused", _jid: string) {
    try {
      // Meta Cloud API soporta typing indicator via messages endpoint
      const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
      const body = {
        messaging_product: "whatsapp",
        status: type === "composing" ? "typing_on" : "typing_off",
      };
      await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(META_REQUEST_TIMEOUT_MS),
      });
    } catch {
      // Non-critical, silently ignore
    }
  }
}
