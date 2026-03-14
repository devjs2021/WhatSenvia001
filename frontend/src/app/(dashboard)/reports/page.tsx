"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Users,
  Megaphone,
  TrendingUp,
  Smartphone,
  Wifi,
  WifiOff,
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
}

interface WeeklyRow {
  date: string;
  count: string;
}

interface SessionRow {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  lastConnectedAt: string | null;
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

const dayNames = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

export default function ReportsPage() {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["reports-stats"],
    queryFn: () => api.get<{ success: boolean; data: DashboardData }>("/dashboard/stats"),
    refetchInterval: 30000,
  });

  const { data: weeklyData, isLoading: weeklyLoading } = useQuery({
    queryKey: ["reports-weekly"],
    queryFn: () => api.get<{ success: boolean; data: WeeklyRow[] }>("/dashboard/weekly"),
    refetchInterval: 30000,
  });

  const { data: sessionsData } = useQuery({
    queryKey: ["reports-sessions"],
    queryFn: () => api.get<{ success: boolean; data: SessionRow[] }>("/dashboard/sessions"),
    refetchInterval: 30000,
  });

  const stats = statsData?.data;
  const weekly = weeklyData?.data ?? [];
  const sessions = sessionsData?.data ?? [];

  if (statsLoading || weeklyLoading) {
    return (
      <div className="space-y-4 md:space-y-6">
        <h1 className="text-lg md:text-xl font-semibold">Reportes</h1>
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
  const totalMsgSent = (msgStats.sent ?? 0) + (msgStats.delivered ?? 0) + (msgStats.read ?? 0);
  const deliveryRate =
    overview.totalMessages > 0
      ? Math.round((totalMsgSent / overview.totalMessages) * 100)
      : 0;

  // Active campaigns (running status)
  const activeCampaigns = stats.recentCampaigns.filter(
    (c) => c.status === "running" || c.status === "scheduled"
  ).length;

  // Weekly chart data
  const last7 = getLast7Days();
  const weeklyMap = new Map(weekly.map((r) => [r.date, Number(r.count)]));
  const chartData = last7.map((date) => ({
    date,
    dayName: dayNames[new Date(date + "T12:00:00").getDay()],
    count: weeklyMap.get(date) ?? 0,
  }));
  const maxCount = Math.max(...chartData.map((d) => d.count), 1);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg md:text-xl font-semibold">Reportes</h1>
        <p className="text-muted-foreground text-sm">
          Metricas y estadisticas de tu cuenta
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Mensajes Enviados</p>
                <p className="text-3xl font-bold mt-1">
                  {overview.totalMessages.toLocaleString()}
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
                <p className="text-sm text-muted-foreground">Contactos Totales</p>
                <p className="text-3xl font-bold mt-1">
                  {overview.totalContacts.toLocaleString()}
                </p>
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
                <p className="text-sm text-muted-foreground">Campanas Activas</p>
                <p className="text-3xl font-bold mt-1">{activeCampaigns}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {overview.totalCampaigns} total
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Megaphone className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tasa de Entrega</p>
                <p className="text-3xl font-bold mt-1">{deliveryRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalMsgSent.toLocaleString()} exitosos
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Mensajes por Dia (Ultimos 7 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-48">
            {chartData.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground font-medium">
                  {d.count > 0 ? d.count : ""}
                </span>
                <div className="w-full flex justify-center">
                  <div
                    className="w-full max-w-12 bg-primary rounded-t transition-all duration-300"
                    style={{
                      height: `${Math.max((d.count / maxCount) * 160, d.count > 0 ? 8 : 4)}px`,
                      opacity: d.count > 0 ? 1 : 0.2,
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{d.dayName}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottom row: Recent Campaigns + Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Campaigns Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Campanas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentCampaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No hay campanas registradas aun.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Nombre</th>
                      <th className="pb-2 font-medium text-muted-foreground">Estado</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Enviados</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentCampaigns.map((campaign) => (
                      <tr key={campaign.id} className="border-b last:border-0 hover:bg-accent/50">
                        <td className="py-2.5 pr-2 truncate max-w-[150px]">{campaign.name}</td>
                        <td className="py-2.5 pr-2">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${statusColors[campaign.status] || ""}`}
                          >
                            {statusLabels[campaign.status] || campaign.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-right font-mono">
                          {campaign.sentCount}/{campaign.totalContacts}
                        </td>
                        <td className="py-2.5 text-right text-muted-foreground">
                          {new Date(campaign.createdAt).toLocaleDateString("es")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Sesiones WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No hay sesiones configuradas.
              </p>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      {session.status === "connected" ? (
                        <Wifi className="h-4 w-4 text-green-500" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-red-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{session.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {session.phone || "Sin numero"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant="outline"
                        className={
                          session.status === "connected"
                            ? "border-green-300 text-green-700 bg-green-50"
                            : "border-gray-300 text-gray-600"
                        }
                      >
                        {session.status === "connected"
                          ? "Conectado"
                          : session.status === "connecting"
                          ? "Conectando..."
                          : session.status === "qr_pending"
                          ? "QR Pendiente"
                          : "Desconectado"}
                      </Badge>
                      {session.lastConnectedAt && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(session.lastConnectedAt).toLocaleString("es")}
                        </p>
                      )}
                    </div>
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
