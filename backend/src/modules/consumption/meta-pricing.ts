// Meta WhatsApp Business API pricing per conversation (USD)
// Source: Meta pricing page — rates effective 2024-2025
// Rates are per conversation (24-hour window), not per message

export type ConversationCategory = "marketing" | "utility" | "authentication" | "service";

interface CountryRate {
  marketing: number;
  utility: number;
  authentication: number;
  service: number;
}

// Country code prefix → country key mapping
const COUNTRY_CODE_MAP: Record<string, string> = {
  "54": "AR", "55": "BR", "56": "CL", "57": "CO", "506": "CR",
  "593": "EC", "503": "SV", "502": "GT", "504": "HN", "52": "MX",
  "505": "NI", "507": "PA", "595": "PY", "51": "PE", "598": "UY",
  "58": "VE", "1": "US", "34": "ES", "44": "GB", "49": "DE",
  "33": "FR", "39": "IT", "91": "IN", "234": "NG", "27": "ZA",
  "966": "SA", "971": "AE", "62": "ID", "60": "MY", "63": "PH",
  "90": "TR", "20": "EG", "7": "RU", "86": "CN", "81": "JP",
  "82": "KR",
};

// Pricing per country (USD per conversation)
const RATES: Record<string, CountryRate> = {
  AR: { marketing: 0.0618, utility: 0.0040, authentication: 0.0303, service: 0.0025 },
  BR: { marketing: 0.0625, utility: 0.0080, authentication: 0.0315, service: 0.0030 },
  CL: { marketing: 0.0889, utility: 0.0040, authentication: 0.0526, service: 0.0035 },
  CO: { marketing: 0.0125, utility: 0.0010, authentication: 0.0068, service: 0.0005 },
  CR: { marketing: 0.0300, utility: 0.0030, authentication: 0.0150, service: 0.0020 },
  EC: { marketing: 0.0300, utility: 0.0030, authentication: 0.0150, service: 0.0020 },
  SV: { marketing: 0.0300, utility: 0.0030, authentication: 0.0150, service: 0.0020 },
  GT: { marketing: 0.0300, utility: 0.0030, authentication: 0.0150, service: 0.0020 },
  HN: { marketing: 0.0300, utility: 0.0030, authentication: 0.0150, service: 0.0020 },
  MX: { marketing: 0.0436, utility: 0.0040, authentication: 0.0212, service: 0.0020 },
  NI: { marketing: 0.0300, utility: 0.0030, authentication: 0.0150, service: 0.0020 },
  PA: { marketing: 0.0300, utility: 0.0030, authentication: 0.0150, service: 0.0020 },
  PY: { marketing: 0.0300, utility: 0.0030, authentication: 0.0150, service: 0.0020 },
  PE: { marketing: 0.0703, utility: 0.0040, authentication: 0.0356, service: 0.0030 },
  UY: { marketing: 0.0300, utility: 0.0030, authentication: 0.0150, service: 0.0020 },
  VE: { marketing: 0.0300, utility: 0.0030, authentication: 0.0150, service: 0.0020 },
  US: { marketing: 0.0250, utility: 0.0040, authentication: 0.0085, service: 0.0030 },
  ES: { marketing: 0.0615, utility: 0.0040, authentication: 0.0325, service: 0.0040 },
  GB: { marketing: 0.0529, utility: 0.0040, authentication: 0.0332, service: 0.0040 },
  DE: { marketing: 0.1365, utility: 0.0080, authentication: 0.0745, service: 0.0040 },
  FR: { marketing: 0.1432, utility: 0.0080, authentication: 0.0745, service: 0.0040 },
  IT: { marketing: 0.0691, utility: 0.0040, authentication: 0.0370, service: 0.0040 },
  IN: { marketing: 0.0107, utility: 0.0017, authentication: 0.0014, service: 0.0016 },
  NG: { marketing: 0.0516, utility: 0.0015, authentication: 0.0282, service: 0.0025 },
  ZA: { marketing: 0.0384, utility: 0.0020, authentication: 0.0192, service: 0.0025 },
  SA: { marketing: 0.0405, utility: 0.0031, authentication: 0.0203, service: 0.0030 },
  AE: { marketing: 0.0384, utility: 0.0031, authentication: 0.0192, service: 0.0030 },
  ID: { marketing: 0.0411, utility: 0.0020, authentication: 0.0300, service: 0.0019 },
  MY: { marketing: 0.0860, utility: 0.0014, authentication: 0.0180, service: 0.0025 },
  PH: { marketing: 0.0300, utility: 0.0030, authentication: 0.0150, service: 0.0020 },
  TR: { marketing: 0.0109, utility: 0.0040, authentication: 0.0020, service: 0.0016 },
  EG: { marketing: 0.1073, utility: 0.0055, authentication: 0.0613, service: 0.0050 },
  RU: { marketing: 0.0802, utility: 0.0040, authentication: 0.0477, service: 0.0040 },
  CN: { marketing: 0.0300, utility: 0.0030, authentication: 0.0150, service: 0.0020 },
  JP: { marketing: 0.0782, utility: 0.0040, authentication: 0.0438, service: 0.0040 },
  KR: { marketing: 0.0300, utility: 0.0030, authentication: 0.0150, service: 0.0020 },
};

const DEFAULT_RATE: CountryRate = {
  marketing: 0.0640,
  utility: 0.0040,
  authentication: 0.0280,
  service: 0.0025,
};

export function getCountryFromPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Try 3-digit codes first, then 2-digit, then 1-digit
  for (const len of [3, 2, 1]) {
    const prefix = digits.substring(0, len);
    if (COUNTRY_CODE_MAP[prefix]) return COUNTRY_CODE_MAP[prefix];
  }
  return "OTHER";
}

export function getConversationRate(country: string, category: ConversationCategory): number {
  const rates = RATES[country] || DEFAULT_RATE;
  return rates[category];
}

export function estimateCampaignCost(
  phones: string[],
  category: ConversationCategory,
): { totalCost: number; breakdown: Record<string, { count: number; rate: number; cost: number }> } {
  const breakdown: Record<string, { count: number; rate: number; cost: number }> = {};
  let totalCost = 0;

  for (const phone of phones) {
    const country = getCountryFromPhone(phone);
    const rate = getConversationRate(country, category);

    if (!breakdown[country]) {
      breakdown[country] = { count: 0, rate, cost: 0 };
    }
    breakdown[country].count += 1;
    breakdown[country].cost += rate;
    totalCost += rate;
  }

  totalCost = Math.round(totalCost * 10000) / 10000;
  for (const key of Object.keys(breakdown)) {
    breakdown[key].cost = Math.round(breakdown[key].cost * 10000) / 10000;
  }

  return { totalCost, breakdown };
}

export function getCategoryFromTemplate(templateCategory: string): ConversationCategory {
  const cat = templateCategory.toUpperCase();
  if (cat === "MARKETING") return "marketing";
  if (cat === "UTILITY") return "utility";
  if (cat === "AUTHENTICATION") return "authentication";
  return "service";
}
