// Límites diarios documentados por Meta según el "current_limit" reportado en el
// webhook phone_number_quality_update (unique customers contactados por cada 24h).
const TIER_DAILY_CAP: Record<string, number> = {
  TIER_50: 250,
  TIER_250: 250,
  TIER_1K: 1000,
  TIER_10K: 10000,
  TIER_100K: 100000,
  TIER_UNLIMITED: 100000,
};

// Tope conservador cuando todavía no conocemos el tier real del número
// (ej. número nuevo, o Meta aún no ha mandado el webhook de calidad).
const DEFAULT_DAILY_CAP = 250;

export interface BatchBlock {
  block: number;
  size: number;
  recommendedDate: string;
}

export interface BatchRecommendation {
  dailyCap: number;
  dailyCapKnown: boolean;
  recommended: boolean;
  batchSize: number;
  blocks: BatchBlock[];
}

function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function recommendBatches(totalContacts: number, messagingLimit?: string | null): BatchRecommendation {
  const dailyCapKnown = !!messagingLimit && messagingLimit in TIER_DAILY_CAP;
  const dailyCap = dailyCapKnown ? TIER_DAILY_CAP[messagingLimit as string] : DEFAULT_DAILY_CAP;
  // Deja margen (80% del límite) para no topar justo el límite del día con otros mensajes normales.
  const batchSize = Math.max(50, Math.floor(dailyCap * 0.8));

  if (totalContacts <= batchSize) {
    return {
      dailyCap,
      dailyCapKnown,
      recommended: false,
      batchSize: totalContacts,
      blocks: [{ block: 1, size: totalContacts, recommendedDate: addDaysISO(0) }],
    };
  }

  const blocks: BatchBlock[] = [];
  let remaining = totalContacts;
  let day = 0;
  while (remaining > 0) {
    const size = Math.min(batchSize, remaining);
    blocks.push({ block: blocks.length + 1, size, recommendedDate: addDaysISO(day) });
    remaining -= size;
    day++;
  }

  return { dailyCap, dailyCapKnown, recommended: true, batchSize, blocks };
}
