"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/i18n";
import {
  Users, Send, BarChart3, Bot, CheckCircle2, XCircle, Clock,
  Smartphone, Activity, MessageSquare, TrendingUp, Wifi, WifiOff,
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

  const stats = data?.data;

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
      {/* Encabezado inspirador */}
      <DashboardHeader
        title={<>Cuidamos de <span className="text-emerald-500 font-extrabold">ti</span> y de tu <span className="text-emerald-500 font-extrabold">tiempo</span>.</>}
        description="Aquí tienes un resumen de la actividad y la salud de tus envíos hoy."
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

      {/* Grid de 2 columnas: Status + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message Status Bars */}
        <DashboardCard className="lg:col-span-2" padding="lg">
          <DashboardCardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                <Activity className="w-4 h-4 text-slate-500" strokeWidth={1.5} />
              </div>
              <DashboardCardTitle>{t('messages.status')}</DashboardCardTitle>
            </div>
          </DashboardCardHeader>
          <div className="space-y-3">
            {msgBars.map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400 w-20 shrink-0">{label}</span>
                <div className="flex-1 h-6 bg-slate-50 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                    style={{ width: `${Math.max((value / maxMsg) * 100, value > 0 ? 6 : 0)}%` }}
                  >
                    {value > 0 && <span className="text-[10px] font-bold text-white">{value.toLocaleString()}</span>}
                  </div>
                </div>
                {value === 0 && <span className="text-xs text-slate-300 w-4">0</span>}
              </div>
            ))}
          </div>
        </DashboardCard>

        {/* Quick Stats */}
        <DashboardCard padding="lg">
          <DashboardCardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-slate-500" strokeWidth={1.5} />
              </div>
              <DashboardCardTitle>{t('dashboard.quickActions')}</DashboardCardTitle>
            </div>
          </DashboardCardHeader>
          <div className="space-y-2">
            {[
              { icon: CheckCircle2, label: t('dashboard.success'), value: totalSent.toLocaleString(), bg: "bg-emerald-50", color: "text-emerald-600", val: "text-emerald-700" },
              { icon: XCircle, label: t('common.error'), value: ms.failed.toLocaleString(), bg: "bg-red-50", color: "text-red-500", val: "text-red-700" },
              { icon: Clock, label: t('messages.queued'), value: (ms.queued + ms.sending).toLocaleString(), bg: "bg-amber-50", color: "text-amber-500", val: "text-amber-700" },
              { icon: Smartphone, label: t('dashboard.session'), value: `${overview.connectedSessions}/${overview.totalSessions}`, bg: "bg-blue-50", color: "text-blue-500", val: "text-blue-700" },
            ].map(({ icon: Icon, label, value, bg, color, val }) => (
              <div key={label} className={`flex items-center justify-between ${bg} rounded-xl px-3 py-2.5`}>
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${color}`} strokeWidth={1.5} />
                  <span className="text-xs font-medium text-slate-600">{label}</span>
                </div>
                <span className={`text-sm font-bold ${val}`}>{value}</span>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      {/* Grid de 2 columnas: Recent Campaigns + Recent Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Campaigns */}
        <DashboardCard padding="lg">
          <DashboardCardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                <Send className="w-4 h-4 text-slate-500" strokeWidth={1.5} />
              </div>
              <DashboardCardTitle>{t('dashboard.recentCampaigns')}</DashboardCardTitle>
            </div>
          </DashboardCardHeader>
          {stats.recentCampaigns.length === 0 ? (
            <div className="py-8 text-center">
              <Send className="w-8 h-8 text-slate-200 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-xs text-slate-400">{t('dashboard.noCampaigns')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.recentCampaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">{c.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[c.status]}`}>
                        {statusLabels[c.status] || c.status}
                      </span>
                      <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-sm font-bold text-slate-900">{c.sentCount}/{c.totalContacts}</p>
                    <p className="text-[10px] text-slate-400">{t('messages.sent')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>

        {/* Recent Messages */}
        <DashboardCard padding="lg">
          <DashboardCardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-slate-500" strokeWidth={1.5} />
              </div>
              <DashboardCardTitle>{t('dashboard.recentMessages')}</DashboardCardTitle>
            </div>
          </DashboardCardHeader>
          {stats.recentMessages.length === 0 ? (
            <div className="py-8 text-center">
              <MessageSquare className="w-8 h-8 text-slate-200 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-xs text-slate-400">{t('dashboard.noMessages')}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {stats.recentMessages.map((msg) => (
                <div key={msg.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="shrink-0">
                    {["sent","delivered","read"].includes(msg.status)
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
                      : msg.status === "failed"
                        ? <XCircle className="w-4 h-4 text-red-500" strokeWidth={1.5} />
                        : <Clock className="w-4 h-4 text-amber-500" strokeWidth={1.5} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-slate-400">{msg.phone}</span>
                      <span className="text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold">
                        {msgStatusLabels[msg.status] || msg.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 truncate mt-0.5">{msg.content}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(msg.createdAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>
    </div>
  );
}
