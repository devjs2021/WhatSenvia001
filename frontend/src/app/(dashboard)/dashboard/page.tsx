"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Send,
  MessageSquare,
  Smartphone,
  Wifi,
  WifiOff,
  BarChart3,
  Bot,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Activity,
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
  recentCampaigns: {
    id: string;
    name: string;
    status: string;
    sentCount: number;
    totalContacts: number;
    createdAt: string;
  }[];
  recentMessages: {
    id: string;
    phone: string;
    content: string;
    status: string;
    sentAt: string | null;
    createdAt: string;
  }[];
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-blue-100 text-blue-700",
  running: "bg-yellow-100 text-yellow-700",
  paused: "bg-orange-100 text-orange-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  scheduled: "Programada",
  running: "Enviando",
  paused: "Pausada",
  completed: "Completada",
  failed: "Fallida",
};

const msgStatusLabels: Record<string, string> = {
  queued: "En cola",
  sending: "Enviando",
  sent: "Enviado",
  delivered: "Entregado",
  read: "Leido",
  failed: "Fallido",
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
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const overview = stats.overview;
  const msgStats = stats.messageStats;
  const totalMsgSent = msgStats.sent + msgStats.delivered + msgStats.read;
  const successRate = stats.overview.totalMessages > 0
    ? Math.round((totalMsgSent / stats.overview.totalMessages) * 100)
    : 0;

  // Message bar chart data
  const msgBarData = [
    { label: "Enviados", value: msgStats.sent, color: "bg-blue-500" },
    { label: "Entregados", value: msgStats.delivered, color: "bg-green-500" },
    { label: "Leidos", value: msgStats.read, color: "bg-emerald-500" },
    { label: "En cola", value: msgStats.queued, color: "bg-yellow-500" },
    { label: "Fallidos", value: msgStats.failed, color: "bg-red-500" },
  ];
  const maxMsgValue = Math.max(...msgBarData.map((d) => d.value), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Resumen general de tu plataforma WhatSenvia
          </p>
        </div>
        <div className="flex items-center gap-2">
          {overview.connectedSessions > 0 ? (
            <Badge variant="outline" className="gap-1 border-green-300 text-green-700 bg-green-50">
              <Wifi className="h-3 w-3" />
              {overview.connectedSessions} sesion{overview.connectedSessions !== 1 ? "es" : ""} activa{overview.connectedSessions !== 1 ? "s" : ""}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 border-red-300 text-red-700 bg-red-50">
              <WifiOff className="h-3 w-3" />
              Sin conexion
            </Badge>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Contactos</p>
                <p className="text-3xl font-bold mt-1">{overview.totalContacts.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mensajes Enviados</p>
                <p className="text-3xl font-bold mt-1">{overview.totalMessages.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {successRate}% tasa de exito
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Send className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Campanas</p>
                <p className="text-3xl font-bold mt-1">{overview.totalCampaigns}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {overview.totalPolls} encuestas
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bot & Flujos</p>
                <p className="text-3xl font-bold mt-1">{overview.activeFlows}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  flujos activos
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Bot className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle row: Message Stats + WhatsApp Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Message Stats Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Estado de Mensajes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {msgBarData.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-24 shrink-0">{item.label}</span>
                  <div className="flex-1 h-8 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                      style={{ width: `${Math.max((item.value / maxMsgValue) * 100, item.value > 0 ? 8 : 0)}%` }}
                    >
                      {item.value > 0 && (
                        <span className="text-xs font-medium text-white">{item.value.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  {item.value === 0 && (
                    <span className="text-xs text-muted-foreground w-8">0</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Resumen Rapido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Exitosos</span>
                </div>
                <span className="font-bold text-green-700">{totalMsgSent.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Fallidos</span>
                </div>
                <span className="font-bold text-red-700">{msgStats.failed.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">En cola</span>
                </div>
                <span className="font-bold text-yellow-700">{(msgStats.queued + msgStats.sending).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">Sesiones</span>
                </div>
                <span className="font-bold text-blue-700">
                  {overview.connectedSessions}/{overview.totalSessions}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Recent Campaigns + Recent Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Campaigns */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4" />
              Campanas Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentCampaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No hay campanas aun. Crea tu primera campana en Envio Masivo.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{campaign.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className={`text-xs ${statusColors[campaign.status] || ""}`}>
                          {statusLabels[campaign.status] || campaign.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(campaign.createdAt).toLocaleDateString("es")}
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-sm font-bold">
                        {campaign.sentCount}/{campaign.totalContacts}
                      </p>
                      <p className="text-xs text-muted-foreground">enviados</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Messages */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Mensajes Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No hay mensajes aun. Envia tu primer mensaje desde Envio Masivo.
              </p>
            ) : (
              <div className="space-y-2">
                {stats.recentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="shrink-0">
                      {msg.status === "sent" || msg.status === "delivered" || msg.status === "read" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : msg.status === "failed" ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">{msg.phone}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {msgStatusLabels[msg.status] || msg.status}
                        </Badge>
                      </div>
                      <p className="text-sm truncate mt-0.5">{msg.content}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(msg.createdAt).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
