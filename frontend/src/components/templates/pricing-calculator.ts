/**
 * Pricing Calculator - Calculadora de costos de WhatsApp Business
 * Basado en la documentación oficial de Meta (Mayo 2026)
 * 
 * Tarifas por mensaje (COP - Colombia) y USD
 * Fuente: Documentación de precios Meta - Abril 2026
 */

// ─── Tipos ────────────────────────────────────────────────────────────────

export type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";
export type Currency = "COP" | "USD";

export interface PricingRate {
  category: TemplateCategory;
  countryCode: string;
  countryName: string;
  rateCOP: number;   // Tarifa en pesos colombianos
  rateUSD: number;   // Tarifa en dólares
  notes?: string;
}

export interface VolumeTier {
  tier: string;
  minMessages: number;
  maxMessages: number | null;
  label: string;
  discount: number; // Porcentaje de descuento sobre tarifa base
}

export interface CostEstimate {
  category: TemplateCategory;
  categoryLabel: string;
  ratePerMessage: number;
  currency: Currency;
  currencySymbol: string;
  estimatedMonthlyCost: number;
  volumeTier: string;
  discountApplied: number;
  isFree: boolean;
  reason: string;
}

export interface CountryInfo {
  code: string;
  name: string;
  flag: string;
  region: string;
}

// ─── Tarifas Base por País (Abril 2026) ───────────────────────────────────

export const PRICING_RATES: PricingRate[] = [
  // Colombia (prioritario)
  { category: "MARKETING", countryCode: "57", countryName: "Colombia", rateCOP: 145, rateUSD: 0.035 },
  { category: "UTILITY", countryCode: "57", countryName: "Colombia", rateCOP: 82, rateUSD: 0.020 },
  { category: "AUTHENTICATION", countryCode: "57", countryName: "Colombia", rateCOP: 51, rateUSD: 0.012 },

  // Argentina
  { category: "MARKETING", countryCode: "54", countryName: "Argentina", rateCOP: 0, rateUSD: 0.065 },
  { category: "UTILITY", countryCode: "54", countryName: "Argentina", rateCOP: 0, rateUSD: 0.030 },
  { category: "AUTHENTICATION", countryCode: "54", countryName: "Argentina", rateCOP: 0, rateUSD: 0.020 },

  // Brasil
  { category: "MARKETING", countryCode: "55", countryName: "Brasil", rateCOP: 0, rateUSD: 0.085 },
  { category: "UTILITY", countryCode: "55", countryName: "Brasil", rateCOP: 0, rateUSD: 0.021 },
  { category: "AUTHENTICATION", countryCode: "55", countryName: "Brasil", rateCOP: 0, rateUSD: 0.014 },

  // Chile
  { category: "MARKETING", countryCode: "56", countryName: "Chile", rateCOP: 0, rateUSD: 0.065 },
  { category: "UTILITY", countryCode: "56", countryName: "Chile", rateCOP: 0, rateUSD: 0.030 },
  { category: "AUTHENTICATION", countryCode: "56", countryName: "Chile", rateCOP: 0, rateUSD: 0.020 },

  // México
  { category: "MARKETING", countryCode: "52", countryName: "México", rateCOP: 0, rateUSD: 0.045 },
  { category: "UTILITY", countryCode: "52", countryName: "México", rateCOP: 0, rateUSD: 0.020 },
  { category: "AUTHENTICATION", countryCode: "52", countryName: "México", rateCOP: 0, rateUSD: 0.012 },

  // Perú
  { category: "MARKETING", countryCode: "51", countryName: "Perú", rateCOP: 0, rateUSD: 0.065 },
  { category: "UTILITY", countryCode: "51", countryName: "Perú", rateCOP: 0, rateUSD: 0.030 },
  { category: "AUTHENTICATION", countryCode: "51", countryName: "Perú", rateCOP: 0, rateUSD: 0.020 },

  // Estados Unidos / Canadá (Norteamérica)
  { category: "MARKETING", countryCode: "1", countryName: "EE.UU./Canadá", rateCOP: 0, rateUSD: 0.035 },
  { category: "UTILITY", countryCode: "1", countryName: "EE.UU./Canadá", rateCOP: 0, rateUSD: 0.010 },
  { category: "AUTHENTICATION", countryCode: "1", countryName: "EE.UU./Canadá", rateCOP: 0, rateUSD: 0.007 },

  // España
  { category: "MARKETING", countryCode: "34", countryName: "España", rateCOP: 0, rateUSD: 0.065 },
  { category: "UTILITY", countryCode: "34", countryName: "España", rateCOP: 0, rateUSD: 0.020 },
  { category: "AUTHENTICATION", countryCode: "34", countryName: "España", rateCOP: 0, rateUSD: 0.012 },

  // Resto de Latinoamérica (genérico)
  { category: "MARKETING", countryCode: "OTHER_LATAM", countryName: "Resto Latinoamérica", rateCOP: 0, rateUSD: 0.075 },
  { category: "UTILITY", countryCode: "OTHER_LATAM", countryName: "Resto Latinoamérica", rateCOP: 0, rateUSD: 0.035 },
  { category: "AUTHENTICATION", countryCode: "OTHER_LATAM", countryName: "Resto Latinoamérica", rateCOP: 0, rateUSD: 0.025 },
];

// ─── Niveles de Volumen (para UTILITY y AUTHENTICATION) ───────────────────

export const VOLUME_TIERS: VolumeTier[] = [
  { tier: "Base", minMessages: 0, maxMessages: 1000, label: "Tarifa base", discount: 0 },
  { tier: "Tier 1", minMessages: 1001, maxMessages: 10000, label: "Volumen bajo", discount: 5 },
  { tier: "Tier 2", minMessages: 10001, maxMessages: 100000, label: "Volumen medio", discount: 10 },
  { tier: "Tier 3", minMessages: 100001, maxMessages: 250000, label: "Volumen alto", discount: 15 },
  { tier: "Tier 4", minMessages: 250001, maxMessages: 500000, label: "Volumen muy alto", discount: 20 },
  { tier: "Tier 5", minMessages: 500001, maxMessages: 1000000, label: "Volumen masivo", discount: 25 },
  { tier: "Tier 6", minMessages: 1000001, maxMessages: null, label: "Enterprise", discount: 30 },
];

// ─── Países Soportados ────────────────────────────────────────────────────

export const COUNTRIES: CountryInfo[] = [
  { code: "57", name: "Colombia", flag: "🇨🇴", region: "Latinoamérica" },
  { code: "54", name: "Argentina", flag: "🇦🇷", region: "Latinoamérica" },
  { code: "55", name: "Brasil", flag: "🇧🇷", region: "Latinoamérica" },
  { code: "56", name: "Chile", flag: "🇨🇱", region: "Latinoamérica" },
  { code: "52", name: "México", flag: "🇲🇽", region: "Latinoamérica" },
  { code: "51", name: "Perú", flag: "🇵🇪", region: "Latinoamérica" },
  { code: "1", name: "EE.UU./Canadá", flag: "🇺🇸", region: "Norteamérica" },
  { code: "34", name: "España", flag: "🇪🇸", region: "Europa" },
  { code: "593", name: "Ecuador", flag: "🇪🇨", region: "Latinoamérica" },
  { code: "58", name: "Venezuela", flag: "🇻🇪", region: "Latinoamérica" },
  { code: "598", name: "Uruguay", flag: "🇺🇾", region: "Latinoamérica" },
  { code: "595", name: "Paraguay", flag: "🇵🇾", region: "Latinoamérica" },
  { code: "591", name: "Bolivia", flag: "🇧🇴", region: "Latinoamérica" },
  { code: "506", name: "Costa Rica", flag: "🇨🇷", region: "Latinoamérica" },
  { code: "503", name: "El Salvador", flag: "🇸🇻", region: "Latinoamérica" },
  { code: "502", name: "Guatemala", flag: "🇬🇹", region: "Latinoamérica" },
  { code: "504", name: "Honduras", flag: "🇭🇳", region: "Latinoamérica" },
  { code: "505", name: "Nicaragua", flag: "🇳🇮", region: "Latinoamérica" },
  { code: "507", name: "Panamá", flag: "🇵🇦", region: "Latinoamérica" },
  { code: "1-809", name: "República Dominicana", flag: "🇩🇴", region: "Latinoamérica" },
];

// ─── Labels de Categorías ─────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<TemplateCategory, { label: string; description: string; color: string }> = {
  MARKETING: {
    label: "Marketing",
    description: "Promociones, ofertas y contenido publicitario",
    color: "text-purple-600",
  },
  UTILITY: {
    label: "Utilidad",
    description: "Notificaciones transaccionales y alertas",
    color: "text-blue-600",
  },
  AUTHENTICATION: {
    label: "Autenticación",
    description: "Códigos de verificación y 2FA",
    color: "text-orange-600",
  },
};

// ─── Funciones de Cálculo ─────────────────────────────────────────────────

/**
 * Obtiene la tarifa para una categoría y país específicos
 */
export function getRate(
  category: TemplateCategory,
  countryCode: string,
  currency: Currency = "COP"
): { rate: number; rateUSD: number; rateCOP: number } | null {
  // Buscar tarifa exacta para el país
  let rate = PRICING_RATES.find((r) => r.category === category && r.countryCode === countryCode);

  // Si no se encuentra, usar tarifa genérica de la región
  if (!rate) {
    const country = COUNTRIES.find((c) => c.code === countryCode);
    if (country?.region === "Latinoamérica") {
      rate = PRICING_RATES.find((r) => r.category === category && r.countryCode === "OTHER_LATAM");
    }
  }

  if (!rate) return null;

  return {
    rate: currency === "COP" ? rate.rateCOP : rate.rateUSD,
    rateUSD: rate.rateUSD,
    rateCOP: rate.rateCOP,
  };
}

/**
 * Obtiene el nivel de volumen basado en la cantidad de mensajes
 */
export function getVolumeTier(messageCount: number): VolumeTier {
  return (
    VOLUME_TIERS.find(
      (t) => messageCount >= t.minMessages && (t.maxMessages === null || messageCount <= t.maxMessages)
    ) || VOLUME_TIERS[0]
  );
}

/**
 * Calcula el costo estimado mensual
 */
export function estimateMonthlyCost(
  category: TemplateCategory,
  countryCode: string,
  monthlyVolume: number,
  currency: Currency = "COP"
): CostEstimate {
  const rateInfo = getRate(category, countryCode, currency);
  const tier = getVolumeTier(monthlyVolume);

  if (!rateInfo) {
    return {
      category,
      categoryLabel: CATEGORY_LABELS[category].label,
      ratePerMessage: 0,
      currency,
      currencySymbol: currency === "COP" ? "$" : "US$",
      estimatedMonthlyCost: 0,
      volumeTier: tier.label,
      discountApplied: 0,
      isFree: false,
      reason: "Tarifa no disponible para este país",
    };
  }

  const baseRate = currency === "COP" ? rateInfo.rateCOP : rateInfo.rateUSD;
  const discountMultiplier = 1 - tier.discount / 100;
  const effectiveRate = baseRate * discountMultiplier;
  const totalCost = effectiveRate * monthlyVolume;

  return {
    category,
    categoryLabel: CATEGORY_LABELS[category].label,
    ratePerMessage: effectiveRate,
    currency,
    currencySymbol: currency === "COP" ? "$" : "US$",
    estimatedMonthlyCost: totalCost,
    volumeTier: tier.label,
    discountApplied: tier.discount,
    isFree: false,
    reason: `${monthlyVolume.toLocaleString()} mensajes x ${formatCurrency(effectiveRate, currency)} c/u`,
  };
}

/**
 * Calcula el ahorro potencial al cambiar de categoría
 */
export function calculateSavings(
  currentCategory: TemplateCategory,
  suggestedCategory: TemplateCategory,
  countryCode: string,
  monthlyVolume: number,
  currency: Currency = "COP"
): { currentCost: number; suggestedCost: number; savings: number; savingsPercent: number } {
  const current = estimateMonthlyCost(currentCategory, countryCode, monthlyVolume, currency);
  const suggested = estimateMonthlyCost(suggestedCategory, countryCode, monthlyVolume, currency);

  return {
    currentCost: current.estimatedMonthlyCost,
    suggestedCost: suggested.estimatedMonthlyCost,
    savings: current.estimatedMonthlyCost - suggested.estimatedMonthlyCost,
    savingsPercent:
      current.estimatedMonthlyCost > 0
        ? ((current.estimatedMonthlyCost - suggested.estimatedMonthlyCost) / current.estimatedMonthlyCost) * 100
        : 0,
  };
}

/**
 * Recomienda la categoría más económica según el propósito
 */
export function recommendCategory(
  purpose: "promotional" | "transactional" | "verification" | "service"
): { category: TemplateCategory; reason: string; savingsNote: string } {
  switch (purpose) {
    case "promotional":
      return {
        category: "MARKETING",
        reason: "Contenido promocional requiere categoría MARKETING",
        savingsNote: "Si es transaccional, usa UTILITY y ahorra hasta 45%",
      };
    case "transactional":
      return {
        category: "UTILITY",
        reason: "Notificaciones transaccionales = UTILITY (más económico)",
        savingsNote: "Ahorras ~45% vs MARKETING",
      };
    case "verification":
      return {
        category: "AUTHENTICATION",
        reason: "Códigos de verificación = AUTHENTICATION (más barato)",
        savingsNote: "Ahorras ~65% vs MARKETING",
      };
    case "service":
      return {
        category: "UTILITY",
        reason: "Mensajes de servicio son GRATIS dentro de CSW",
        savingsNote: "Costo $0 si se envía dentro de ventana de servicio",
      };
  }
}

/**
 * Formatea un valor monetario
 */
export function formatCurrency(amount: number, currency: Currency): string {
  if (currency === "COP") {
    return `$${Math.round(amount).toLocaleString("es-CO")}`;
  }
  return `$${amount.toFixed(4)} USD`;
}

/**
 * Formatea costo total
 */
export function formatTotalCost(amount: number, currency: Currency): string {
  if (currency === "COP") {
    return `$${Math.round(amount).toLocaleString("es-CO")}`;
  }
  return `$${amount.toFixed(2)} USD`;
}
