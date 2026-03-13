import type { IWhatsAppProvider } from "./interfaces/whatsapp-provider.interface.js";
import { BaileysProvider } from "./providers/baileys.provider.js";
import { MetaCloudProvider } from "./providers/meta-cloud.provider.js";
import { env } from "../../config/env.js";

export type ProviderType = "baileys" | "meta-cloud";

let instance: IWhatsAppProvider | null = null;

export function getWhatsAppProvider(type?: ProviderType): IWhatsAppProvider {
  if (instance) return instance;

  const providerType = type || (env.META_ACCESS_TOKEN ? "meta-cloud" : "baileys");

  switch (providerType) {
    case "meta-cloud":
      instance = new MetaCloudProvider();
      break;
    case "baileys":
    default:
      instance = new BaileysProvider();
      break;
  }

  return instance;
}

export function resetProvider(): void {
  instance = null;
}
