import type { IWhatsAppProvider } from "./interfaces/whatsapp-provider.interface.js";
import { BaileysProvider } from "./providers/baileys.provider.js";
import { MetaCloudProvider } from "./providers/meta-cloud.provider.js";
import { db } from "../../config/database.js";
import { whatsappSessions } from "../database/schema/whatsapp-sessions.js";
import { eq } from "drizzle-orm";
import { decrypt } from "../security/encryption.service.js";

export type ProviderType = "baileys" | "meta-cloud";

// Cache providers by sessionId so we don't recreate them on every call
const providerCache = new Map<string, IWhatsAppProvider>();

/**
 * Returns the appropriate WhatsApp provider for a given session.
 * - If the session has connection_type = 'meta_cloud', creates a MetaCloudProvider
 *   with that session's access token and phone number ID.
 * - Otherwise returns a BaileysProvider (shared instance for all Baileys sessions).
 */
let baileysInstance: BaileysProvider | null = null;

export async function getWhatsAppProvider(sessionId: string): Promise<IWhatsAppProvider> {
  // Check cache first
  const cached = providerCache.get(sessionId);
  if (cached) return cached;

  // Look up session in DB
  const [session] = await db
    .select()
    .from(whatsappSessions)
    .where(eq(whatsappSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new Error(`WhatsApp session not found: ${sessionId}`);
  }

  let provider: IWhatsAppProvider;

  if (session.connectionType === "meta_cloud") {
    if (!session.metaAccessToken || !session.metaPhoneNumberId) {
      throw new Error(`Meta Cloud session ${sessionId} is missing access token or phone number ID`);
    }
    const decryptedToken = decrypt(session.metaAccessToken);
    provider = new MetaCloudProvider(decryptedToken, session.metaPhoneNumberId, session.phone || undefined);
  } else {
    // Baileys: use a single shared instance (handles multiple sessions internally)
    if (!baileysInstance) {
      baileysInstance = new BaileysProvider();
    }
    provider = baileysInstance;
  }

  providerCache.set(sessionId, provider);
  return provider;
}

/**
 * Remove a provider from the cache (e.g. when a session is deleted or credentials change).
 */
export function clearProviderCache(sessionId?: string): void {
  if (sessionId) {
    providerCache.delete(sessionId);
  } else {
    providerCache.clear();
    baileysInstance = null;
  }
}
