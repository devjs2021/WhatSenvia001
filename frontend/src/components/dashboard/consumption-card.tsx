"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/i18n";
import { DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { DashboardCard, DashboardCardHeader, DashboardCardTitle } from "@/components/ui/dashboard-card";

interface ConsumptionData {
  totalCost: number;
  totalConversations: number;
  breakdown: Record<string, { count: number; cost: number }>;
  byCountry: Record<string, { count: number; cost: number }>;
  period: { from: string; to: string };
}

const categoryColors: Record<string, string> = {
  marketing: "bg-violet-400",
  utility: "bg-blue-400",
  authentication: "bg-amber-400",
  service: "bg-emerald-400",
};

const categoryBgColors: Record<string, string> = {
  marketing: "bg-violet-50 border-violet-100 text-violet-700",
  utility: "bg-blue-50 border-blue-100 text-blue-700",
  authentication: "bg-amber-50 border-amber-100 text-amber-700",
  service: "bg-emerald-50 border-emerald-100 text-emerald-700",
};

export function ConsumptionCard() {
  const { t } = useI18n();

  const { data, isLoading } = useQuery({
    queryKey: ["consumption-stats"],
    queryFn: () => api.get<{ success: boolean; data: ConsumptionData }>("/consumption/stats"),
    refetchInterval: 60000,
  });

  const stats = data?.data;

  return (
    <DashboardCard padding="lg">
      <DashboardCardHeader>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-emerald-600" strokeWidth={1.5} />
          </div>
          <div>
            <DashboardCardTitle>{t("dashboard.consumption")}</DashboardCardTitle>
            <p className="text-[11px] text-slate-400 mt-0.5">{t("dashboard.consumptionDesc")}</p>
          </div>
        </div>
      </DashboardCardHeader>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
        </div>
      ) : !stats || stats.totalConversations === 0 ? (
        <div className="text-center py-6">
          <DollarSign className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-xs text-slate-400">{t("dashboard.noMetaSessions")}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Total cost */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-extrabold text-slate-900">
                ${stats.totalCost.toFixed(2)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {stats.totalConversations.toLocaleString()} {t("dashboard.conversations")}
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <TrendingUp className="w-3 h-3" />
              USD
            </div>
          </div>

          {/* Category breakdown */}
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(stats.breakdown).map(([category, data]) => (
              <div
                key={category}
                className={`flex flex-col rounded-xl border p-3 ${categoryBgColors[category] || "bg-slate-50 border-slate-100 text-slate-600"}`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  {t(`dashboard.${category}`)}
                </span>
                <span className="text-lg font-bold mt-1">${data.cost.toFixed(2)}</span>
                <span className="text-[10px] opacity-70">{data.count} conv.</span>
              </div>
            ))}
          </div>

          {/* Progress bars by category */}
          <div className="space-y-2">
            {Object.entries(stats.breakdown)
              .filter(([, d]) => d.count > 0)
              .sort((a, b) => b[1].cost - a[1].cost)
              .map(([category, data]) => {
                const pct = stats.totalCost > 0 ? (data.cost / stats.totalCost) * 100 : 0;
                return (
                  <div key={category} className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-slate-500 w-20 truncate">
                      {t(`dashboard.${category}`)}
                    </span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${categoryColors[category] || "bg-slate-400"}`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 w-10 text-right">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
