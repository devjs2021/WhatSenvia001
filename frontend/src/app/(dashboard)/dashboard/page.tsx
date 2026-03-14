"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Users, Send, MessageSquare, Smartphone, Wifi, WifiOff,
  BarChart3, Bot, CheckCircle2, XCircle, Clock, TrendingUp, Activity,
} from "lucide-react";

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
  draft: "bg-gray-100 text-gray-600",
  scheduled: "bg-blue-100 text-blue-700",
  running: "bg-yellow-100 text-yellow-700",
  paused: "bg-orange-100 text-orange-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  draft: "Borrador", scheduled: "Programada", running: "Enviando",
  paused: "Pausada", completed: "Completada", failed: "Fallida",
};

const msgStatusLabels: Record<string, string> = {
  queued: "En cola", sending: "Enviando", sent: "Enviado",
  delivered: "Entregado", read: "Leído", failed: "Fallido",
};

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get<{ success: boolean; data: DashboardData }>("/dashboard/stats"),
    refetchInterval: 30000,
  });

  const stats = data?.data;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-6 w-40 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { overview, messageStats: ms } = stats;
  const totalSent = ms.sent + ms.delivered + ms.read;
  const successRate = overview.totalMessages > 0 ? Math.round((totalSent / overview.totalMessages) * 100) : 0;
  const maxMsg = Math.max(ms.sent, ms.delivered, ms.read, ms.queued, ms.failed, 1);

  const statCards = [
    { label: "Contactos", value: overview.totalContacts.toLocaleString(), sub: "registrados", icon: Users, color: "bg-blue-50 dark:bg-blue-900/20", iconColor: "text-blue-500" },
    { label: "Mensajes", value: overview.totalMessages.toLocaleString(), sub: `${successRate}% éxito`, icon: Send, color: "bg-green-50 dark:bg-green-900/20", iconColor: "text-green-500" },
    { label: "Campañas", value: overview.totalCampaigns.toString(), sub: `${overview.totalPolls} encuestas`, icon: BarChart3, color: "bg-violet-50 dark:bg-violet-900/20", iconColor: "text-violet-500" },
    { label: "Bot Flows", value: overview.activeFlows.toString(), sub: "flujos activos", icon: Bot, color: "bg-orange-50 dark:bg-orange-900/20", iconColor: "text-orange-500" },
  ];

  const msgBars = [
    { label: "Enviados", value: ms.sent, color: "bg-blue-400" },
    { label: "Entregados", value: ms.delivered, color: "bg-green-400" },
    { label: "Leídos", value: ms.read, color: "bg-emerald-500" },
    { label: "En cola", value: ms.queued, color: "bg-yellow-400" },
    { label: "Fallidos", value: ms.failed, color: "bg-red-400" },
  ];

  return (
    <div className="bg-gray-50/50 dark:bg-gray-950/50 p-3 md:p-6 space-y-3 md:space-y-4">

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">Resumen general de tu plataforma</p>
        </div>
        <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl border ${
          overview.connectedSessions > 0
            ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
            : "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
        }`}>
          {overview.connectedSessions > 0
            ? <><Wifi className="h-3.5 w-3.5" />{overview.connectedSessions} sesión{overview.connectedSessions !== 1 ? "es" : ""} activa{overview.connectedSessions !== 1 ? "s" : ""}</>
            : <><WifiOff className="h-3.5 w-3.5" />Sin conexión</>}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ label, value, sub, icon: Icon, color, iconColor }) => (
          <div key={label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-3 md:p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
              <div className={`h-8 w-8 rounded-xl ${color} flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${iconColor}`} />
              </div>
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Bar chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-3 md:p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Activity className="h-3.5 w-3.5 text-gray-500" />
            </div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Estado de Mensajes</p>
          </div>
          <div className="space-y-2.5">
            {msgBars.map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-20 shrink-0">{label}</span>
                <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                    style={{ width: `${Math.max((value / maxMsg) * 100, value > 0 ? 6 : 0)}%` }}
                  >
                    {value > 0 && <span className="text-[10px] font-bold text-white">{value.toLocaleString()}</span>}
                  </div>
                </div>
                {value === 0 && <span className="text-xs text-gray-300 w-4">0</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Quick stats */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-gray-500" />
            </div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Resumen</p>
          </div>
          <div className="space-y-2">
            {[
              { icon: CheckCircle2, label: "Exitosos", value: totalSent.toLocaleString(), bg: "bg-green-50 dark:bg-green-900/20", color: "text-green-600 dark:text-green-400", val: "text-green-700 dark:text-green-400" },
              { icon: XCircle, label: "Fallidos", value: ms.failed.toLocaleString(), bg: "bg-red-50 dark:bg-red-900/20", color: "text-red-500", val: "text-red-700 dark:text-red-400" },
              { icon: Clock, label: "En cola", value: (ms.queued + ms.sending).toLocaleString(), bg: "bg-yellow-50 dark:bg-yellow-900/20", color: "text-yellow-500", val: "text-yellow-700 dark:text-yellow-400" },
              { icon: Smartphone, label: "Sesiones", value: `${overview.connectedSessions}/${overview.totalSessions}`, bg: "bg-blue-50 dark:bg-blue-900/20", color: "text-blue-500", val: "text-blue-700 dark:text-blue-400" },
            ].map(({ icon: Icon, label, value, bg, color, val }) => (
              <div key={label} className={`flex items-center justify-between ${bg} rounded-xl px-3 py-2.5`}>
                <div className="flex items-center gap-2">
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
                </div>
                <span className={`text-sm font-bold ${val}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

        {/* Campañas recientes */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Send className="h-3.5 w-3.5 text-gray-500" />
            </div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Campañas Recientes</p>
          </div>
          {stats.recentCampaigns.length === 0 ? (
            <div className="py-8 text-center">
              <Send className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Aún no hay campañas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.recentCampaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{c.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColors[c.status]}`}>
                        {statusLabels[c.status] || c.status}
                      </span>
                      <span className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleDateString("es")}</span>
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{c.sentCount}/{c.totalContacts}</p>
                    <p className="text-[10px] text-gray-400">enviados</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mensajes recientes */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
            </div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Mensajes Recientes</p>
          </div>
          {stats.recentMessages.length === 0 ? (
            <div className="py-8 text-center">
              <MessageSquare className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Aún no hay mensajes</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {stats.recentMessages.map((msg) => (
                <div key={msg.id} className="flex items-center gap-2.5 py-2 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="shrink-0">
                    {["sent","delivered","read"].includes(msg.status)
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      : msg.status === "failed"
                        ? <XCircle className="h-3.5 w-3.5 text-red-500" />
                        : <Clock className="h-3.5 w-3.5 text-yellow-500" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-gray-400">{msg.phone}</span>
                      <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded-full">
                        {msgStatusLabels[msg.status] || msg.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 truncate mt-0.5">{msg.content}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {new Date(msg.createdAt).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
