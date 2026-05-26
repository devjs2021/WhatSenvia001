"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/i18n";
import {
  Users, Send, BarChart3, Bot, CheckCircle2, XCircle, Clock,
  Smartphone, Activity, MessageSquare, TrendingUp, Wifi, WifiOff,
  Loader2,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardKPIs } from "@/components/dashboard/dashboard-kpis";
import { DashboardChart } from "@/components/dashboard/dashboard-chart";
import { DashboardCard, DashboardCardHeader, DashboardCardTitle } from "@/components/ui/dashboard-card";

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

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  scheduled: "bg-blue-100 text-blue-700",
  running: "bg-amber-100 text-amber-700",
  paused: "bg-orange-100 text-orange-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
};

export default function DashboardPage() {
  const { locale, t } = useI18n();

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

  const statusLabels: Record<string, string> = {
    draft: t('campaigns.draft'),
    scheduled: t('campaigns.scheduled'),
    running: t('campaigns.running'),
    paused: t('campaigns.paused'),
    completed: t('campaigns.completed'),
    failed: t('campaigns.failed'),
  };

  const msgStatusLabels: Record<string, string> = {
    queued: t('messages.queued'),
    sending: t('messages.sending'),
    sent: t('messages.sent'),
    delivered: t('messages.delivered'),
    read: t('messages.read'),
    failed: t('messages.failed'),
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-48 bg-slate-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-50 rounded-3xl animate-pulse" />
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

  const msgBars = [
    { label: t('messages.sent'), value: ms.sent, color: "bg-blue-400" },
    { label: t('messages.delivered'), value: ms.delivered, color: "bg-emerald-400" },
    { label: t('messages.read'), value: ms.read, color: "bg-emerald-600" },
    { label: t('messages.queued'), value: ms.queued, color: "bg-amber-400" },
    { label: t('messages.failed'), value: ms.failed, color: "bg-red-400" },
  ];

  const maxMsg = Math.max(ms.sent, ms.delivered, ms.read, ms.queued, ms.failed, 1);

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <DashboardHeader
        title="Dashboard"
        description="Resumen de actividad y salud de tus envíos."
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

      {/* KPIs */}
      <DashboardKPIs items={kpiItems} columns={3} />

      {/* Gráfico de tendencia */}
      <DashboardChart
        title="Historial de Envíos del Mes"
        description="Total de mensajes despachados sin bloqueos."
      />

      {/* Message Stats */}
      <DashboardCard padding="lg">
        <DashboardCardHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-slate-500" strokeWidth={1.5} />
            </div>
            <DashboardCardTitle>Message Status</DashboardCardTitle>
          </div>
        </DashboardCardHeader>
        {msgStatsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
          </div>
        ) : msgStats ? (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
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
                  className={`flex flex-col items-center justify-center rounded-xl border p-3 ${statusStyles[status] || "bg-slate-50 border-slate-100 text-slate-600"}`}
                >
                  <span className="text-xl font-bold">{count}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider mt-0.5">{status}</span>
                </div>
              );
            })}
          </div>
        ) : null}
      </DashboardCard>
    </div>
  );
}
