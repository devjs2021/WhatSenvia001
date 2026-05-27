"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/i18n";
import {
  Users, Send, BarChart3, MessageSquare, Wifi, WifiOff, Loader2, Smartphone, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardKPIs } from "@/components/dashboard/dashboard-kpis";
import { DashboardChart } from "@/components/dashboard/dashboard-chart";
import { DashboardCard, DashboardCardHeader, DashboardCardTitle } from "@/components/ui/dashboard-card";
import { ConsumptionCard } from "@/components/dashboard/consumption-card";

interface DashboardData {
  overview: {
    totalContacts: number;
    totalCampaigns: number;
    totalMessages: number;
    totalSessions: number;
    connectedSessions: number;
    totalPolls: number;
    activeFlows: number;
  };
  messageStats: Record<string, number>;
  recentCampaigns: { id: string; name: string; status: string; sentCount: number; totalContacts: number; createdAt: string }[];
  recentMessages: { id: string; phone: string; content: string; status: string; sentAt: string | null; createdAt: string }[];
}


export default function DashboardPage() {
  const { t } = useI18n();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get<{ success: boolean; data: DashboardData }>("/dashboard/stats"),
    refetchInterval: 30000,
  });

  const { data: msgStatsData, isLoading: msgStatsLoading } = useQuery({
    queryKey: ["message-stats"],
    queryFn: () => api.get<{ success: boolean; data: Record<string, number> }>("/messages/stats"),
    refetchInterval: 30000,
  });

  const stats = data?.data;
  const msgStats = msgStatsData?.data;


  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-7 w-40 bg-slate-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-50 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { overview, messageStats: ms } = stats;
  const totalSent = ms.sent + ms.delivered + ms.read;
  const successRate = overview.totalMessages > 0 ? Math.round((totalSent / overview.totalMessages) * 100) : 0;

  const kpiItems = [
    {
      label: t('dashboard.totalContacts'),
      value: overview.totalContacts.toLocaleString(),
      sub: t('dashboard.contacts'),
      icon: Users,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
    },
    {
      label: t('dashboard.messages'),
      value: overview.totalMessages.toLocaleString(),
      sub: `${successRate}% ${t('dashboard.success')}`,
      icon: Send,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: t('nav.bulkSend'),
      value: overview.totalCampaigns.toString(),
      sub: `${overview.totalPolls} ${t('nav.polls')}`,
      icon: BarChart3,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-500",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <DashboardHeader
        title={t('nav.dashboard')}
        description={t('dashboard.description')}
      >
        <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full ${
          overview.connectedSessions > 0
            ? "bg-emerald-50 border border-emerald-100 text-emerald-700"
            : "bg-red-50 border border-red-100 text-red-700"
        }`}>
          {overview.connectedSessions > 0 ? (
            <><Wifi className="w-3.5 h-3.5" />{overview.connectedSessions} {t('dashboard.sessionActive')}</>
          ) : (
            <><WifiOff className="w-3.5 h-3.5" />{t('whatsapp.disconnected')}</>
          )}
        </div>
      </DashboardHeader>

      {/* Quick Connect Shortcut */}
      {overview.connectedSessions === 0 && (
        <Link href="/whatsapp" className="block group">
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 transition-all hover:shadow-md hover:border-emerald-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Smartphone className="w-4.5 h-4.5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900">
                    {t('dashboard.connectWhatsapp')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t('dashboard.connectWhatsappDesc')}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      )}

      {/* KPIs */}
      <DashboardKPIs items={kpiItems} columns={3} />

      {/* Chart + Consumption + Message Stats — all in one row on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart */}
        <DashboardChart
          title={t('dashboard.sendHistory')}
          description={t('dashboard.sendHistoryDesc')}
        />

        {/* Consumption */}
        <ConsumptionCard />

        {/* Message Status */}
        <DashboardCard>
          <DashboardCardHeader className="!mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center">
                <MessageSquare className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.5} />
              </div>
              <DashboardCardTitle>{t('dashboard.messageStatus')}</DashboardCardTitle>
            </div>
          </DashboardCardHeader>
          {msgStatsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
            </div>
          ) : msgStats ? (
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(msgStats).map(([status, count]) => {
                const statusStyles: Record<string, string> = {
                  queued: "bg-amber-50 border-amber-100 text-amber-700",
                  sending: "bg-blue-50 border-blue-100 text-blue-700",
                  sent: "bg-sky-50 border-sky-100 text-sky-700",
                  delivered: "bg-emerald-50 border-emerald-100 text-emerald-700",
                  read: "bg-emerald-100 border-emerald-200 text-emerald-800",
                  failed: "bg-red-50 border-red-100 text-red-700",
                };
                return (
                  <div
                    key={status}
                    className={`flex flex-col items-center justify-center rounded-lg border px-2 py-2 ${statusStyles[status] || "bg-slate-50 border-slate-100 text-slate-600"}`}
                  >
                    <span className="text-lg font-bold leading-tight">{count}</span>
                    <span className="text-[9px] font-semibold uppercase tracking-wider mt-0.5">{status}</span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </DashboardCard>
      </div>
    </div>
  );
}
