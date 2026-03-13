import type {
  IWhatsAppProvider,
  SendMessageOptions,
  SendMessageResult,
  WhatsAppConnectionEvents,
} from "../interfaces/whatsapp-provider.interface.js";
import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";

/**
 * Meta Cloud API Provider (Phase 2)
 *
 * This provider will be used once the Meta Business API is approved.
 * It uses the official WhatsApp Cloud API via Meta's Graph API.
 *
 * Prerequisites:
 * - Meta Business Account approved
 * - WhatsApp Business API access
 * - Valid access token and phone number ID
 */
export class MetaCloudProvider implements IWhatsAppProvider {
  readonly providerName = "meta-cloud";
  private readonly baseUrl = "https://graph.facebook.com/v21.0";

  async connect(_sessionId: string, events: WhatsAppConnectionEvents): Promise<void> {
    if (!env.META_ACCESS_TOKEN || !env.META_PHONE_NUMBER_ID) {
      throw new Error("Meta Cloud API credentials not configured");
    }
    // Meta Cloud API doesn't need QR - it's always "connected" when credentials are valid
    events.onConnected(env.META_PHONE_NUMBER_ID);
    logger.info("Meta Cloud API provider connected");
  }

  async disconnect(_sessionId: string): Promise<void> {
    logger.info("Meta Cloud API provider disconnected");
  }

  isConnected(_sessionId: string): boolean {
    return !!env.META_ACCESS_TOKEN && !!env.META_PHONE_NUMBER_ID;
  }

  async sendMessage(_sessionId: string, options: SendMessageOptions): Promise<SendMessageResult> {
    try {
      const url = `${this.baseUrl}/${env.META_PHONE_NUMBER_ID}/messages`;

      const body: Record<string, any> = {
        messaging_product: "whatsapp",
        to: options.phone.replace(/[^0-9]/g, ""),
        type: "text",
        text: { body: options.message },
      };

      if (options.mediaUrl && options.mediaType) {
        body.type = options.mediaType;
        body[options.mediaType] = {
          link: options.mediaUrl,
          caption: options.message,
        };
        delete body.text;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.META_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data: any = await response.json();

      if (!response.ok) {
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
      phone: env.META_PHONE_NUMBER_ID,
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

  async sendPresenceUpdate(_sessionId: string, _type: "composing" | "paused", _jid: string) {
    // Not supported by Meta Cloud API
  }
}
