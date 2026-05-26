"use client";

import { useState, useMemo } from "react";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Info,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Globe,
  MessageCircle,
  Zap,
  PiggyBank,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { DashboardCard, DashboardCardHeader, DashboardCardTitle } from "@/components/ui/dashboard-card";
import {
  estimateMonthlyCost,
  calculateSavings,
  recommendCategory,
  getVolumeTier,
  getRate,
  formatCurrency,
  formatTotalCost,
  COUNTRIES,
  CATEGORY_LABELS,
  VOLUME_TIERS,
  type TemplateCategory,
  type Currency,
  type CostEstimate,
} from "./pricing-calculator";

// ─── Props ────────────────────────────────────────────────────────────────

interface PricingPanelProps {
  selectedCategory?: TemplateCategory;
  selectedCountry?: string;
  monthlyVolume?: number;
  showRecommendations?: boolean;
  variant?: "inline" | "full";
}

// ─── Main Component ───────────────────────────────────────────────────────

export function PricingPanel({
  selectedCategory,
  selectedCountry = "57",
  monthlyVolume = 5000,
  showRecommendations = true,
  variant = "full",
}: PricingPanelProps) {
  const [country, setCountry] = useState(selectedCountry);
  const [volume, setVolume] = useState(monthlyVolume);
  const [currency, setCurrency] = useState<Currency>("COP");
  const [expandedTiers, setExpandedTiers] = useState(false);

  // ── Calculations ──
  const marketingCost = useMemo(
    () => estimateMonthlyCost("MARKETING", country, volume, currency),
    [country, volume, currency]
  );
  const utilityCost = useMemo(
    () => estimateMonthlyCost("UTILITY", country, volume, currency),
    [country, volume, currency]
  );
  const authCost = useMemo(
    () => estimateMonthlyCost("AUTHENTICATION", country, volume, currency),
    [country, volume, currency]
  );

  const savings = useMemo(() => {
    if (selectedCategory) {
      if (selectedCategory === "MARKETING") {
        return calculateSavings("MARKETING", "UTILITY", country, volume, currency);
      }
      if (selectedCategory === "UTILITY") {
        return calculateSavings("UTILITY", "AUTHENTICATION", country, volume, currency);
      }
    }
    return calculateSavings("MARKETING", "UTILITY", country, volume, currency);
  }, [selectedCategory, country, volume, currency]);

  const currentTier = useMemo(() => getVolumeTier(volume), [volume]);

  const selectedCountryInfo = useMemo(
    () => COUNTRIES.find((c) => c.code === country),
    [country]
  );

  // ── Render ──
  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Country Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
            País del destinatario
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Volume Input */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
            Mensajes por mes
          </label>
          <div className="relative">
            <MessageCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="number"
              min={1}
              max={10000000}
              value={volume}
              onChange={(e) => setVolume(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        </div>

        {/* Currency Toggle */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
            Moneda
          </label>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setCurrency("COP")}
              className={`flex-1 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                currency === "COP"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              COP $
            </button>
            <button
              type="button"
              onClick={() => setCurrency("USD")}
              className={`flex-1 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                currency === "USD"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              USD $
            </button>
          </div>
        </div>
      </div>

      {/* Cost Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Marketing */}
        <CostCard
          category="MARKETING"
          cost={marketingCost}
          isSelected={selectedCategory === "MARKETING"}
          currency={currency}
        />
        {/* Utility */}
        <CostCard
          category="UTILITY"
          cost={utilityCost}
          isSelected={selectedCategory === "UTILITY"}
          currency={currency}
        />
        {/* Authentication */}
        <CostCard
          category="AUTHENTICATION"
          cost={authCost}
          isSelected={selectedCategory === "AUTHENTICATION"}
          currency={currency}
        />
      </div>

      {/* Savings Alert */}
      {selectedCategory && selectedCategory !== "AUTHENTICATION" && savings.savings > 0 && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <PiggyBank className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-800">
                ¡Ahorro potencial!
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                Si usas {selectedCategory === "MARKETING" ? "UTILITY" : "AUTHENTICATION"} en lugar de{" "}
                {CATEGORY_LABELS[selectedCategory].label}, podrías ahorrar{" "}
                <strong>{formatTotalCost(savings.savings, currency)}</strong> al mes (
                {savings.savingsPercent.toFixed(0)}% menos).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Volume Tier Info */}
      <div>
        <button
          type="button"
          onClick={() => setExpandedTiers(!expandedTiers)}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 hover:text-slate-600 transition-colors"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Niveles de volumen
          {expandedTiers ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>

        {/* Current Tier Badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-slate-500">Nivel actual:</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-600">
            {currentTier.tier} - {currentTier.label}
          </span>
          {currentTier.discount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600">
              {currentTier.discount}% descuento
            </span>
          )}
        </div>

        {/* Tiers Table */}
        {expandedTiers && (
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Nivel</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Mensajes</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-500">Dto.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {VOLUME_TIERS.map((tier) => {
                  const isActive =
                    volume >= tier.minMessages &&
                    (tier.maxMessages === null || volume <= tier.maxMessages);
                  return (
                    <tr
                      key={tier.tier}
                      className={`${isActive ? "bg-emerald-50/50" : ""} transition-colors`}
                    >
                      <td className="px-3 py-2 font-medium text-slate-700">
                        {tier.tier}
                        {isActive && (
                          <span className="ml-1.5 text-emerald-500">←</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-500">
                        {tier.minMessages.toLocaleString()}
                        {tier.maxMessages
                          ? ` - ${tier.maxMessages.toLocaleString()}`
                          : "+"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">
                        {tier.discount > 0 ? `${tier.discount}%` : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recommendation */}
      {showRecommendations && (
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-800">Recomendación de categoría</p>
              <div className="mt-2 space-y-1.5">
                <RecoItem
                  purpose="transactional"
                  country={country}
                  volume={volume}
                  currency={currency}
                />
                <RecoItem
                  purpose="verification"
                  country={country}
                  volume={volume}
                  currency={currency}
                />
                <RecoItem
                  purpose="service"
                  country={country}
                  volume={volume}
                  currency={currency}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer note */}
      <p className="text-[10px] text-slate-400 text-center">
        * Tarifas basadas en la documentación oficial de Meta (Abril 2026).
        Los costos reales pueden variar según el nivel de volumen y la región.
      </p>
    </div>
  );
}

// ─── Cost Card ────────────────────────────────────────────────────────────

function CostCard({
  category,
  cost,
  isSelected,
  currency,
}: {
  category: TemplateCategory;
  cost: CostEstimate;
  isSelected?: boolean;
  currency: Currency;
}) {
  const info = CATEGORY_LABELS[category];

  return (
    <div
      className={`rounded-2xl border-2 p-4 transition-all ${
        isSelected
          ? "border-emerald-500 bg-emerald-50/50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <DollarSign className={`h-4 w-4 ${info.color}`} />
        <span className={`text-xs font-semibold ${info.color}`}>{info.label}</span>
      </div>

      <div className="space-y-1">
        <p className="text-2xl font-bold font-mono text-slate-900">
          {formatTotalCost(cost.estimatedMonthlyCost, currency)}
        </p>
        <p className="text-[10px] text-slate-400">
          {formatCurrency(cost.ratePerMessage, currency)} / mensaje
        </p>
        {cost.discountApplied > 0 && (
          <p className="text-[10px] text-emerald-600 font-medium">
            Incluye {cost.discountApplied}% descuento por volumen
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Recommendation Item ──────────────────────────────────────────────────

function RecoItem({
  purpose,
  country,
  volume,
  currency,
}: {
  purpose: "promotional" | "transactional" | "verification" | "service";
  country: string;
  volume: number;
  currency: Currency;
}) {
  const reco = recommendCategory(purpose);
  const cost = estimateMonthlyCost(reco.category, country, volume, currency);

  return (
    <div className="flex items-start gap-2 text-xs">
      <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
      <div>
        <span className="font-medium text-blue-700 capitalize">{purpose}: </span>
        <span className="text-blue-600">
          {reco.category} - {formatTotalCost(cost.estimatedMonthlyCost, currency)}/mes
        </span>
        <p className="text-blue-400 mt-0.5">{reco.savingsNote}</p>
      </div>
    </div>
  );
}
