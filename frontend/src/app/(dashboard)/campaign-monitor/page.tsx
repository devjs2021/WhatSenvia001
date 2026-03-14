"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Radio,
} from "lucide-react";

interface ProgressEvent {
  campaignId: string;
  phone: string;
  status: "sent" | "failed";
  error?: string;
  sent: number;
  failed: number;
  total: number;
  pending: number;
  timestamp: string;
}

function maskPhone(phone: string): string {
  if (phone.length <= 6) return phone;
  return phone.slice(0, 3) + "***" + phone.slice(-3);
}

function formatETA(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return "--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export default function CampaignMonitorPage() {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState({ sent: 0, failed: 0, total: 0, pending: 0 });
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  const logRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const handleMessage = useCallback((raw: MessageEvent) => {
    try {
      const parsed = JSON.parse(raw.data);
      if (parsed.event !== "campaign_progress") return;

      const data = parsed.data as Omit<ProgressEvent, "timestamp">;
      const event: ProgressEvent = {
        ...data,
        timestamp: new Date().toISOString(),
      };

      if (!campaignId && data.campaignId) {
        setCampaignId(data.campaignId);
      }

      setStats({
        sent: data.sent,
        failed: data.failed,
        total: data.total,
        pending: data.pending,
      });

      setStartTime((prev) => prev ?? Date.now());

      setEvents((prev) => {
        const next = [...prev, event];
        return next.length > 100 ? next.slice(-100) : next;
      });
    } catch {
      // ignore parse errors
    }
  }, [campaignId]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//localhost:3001/api/campaign-control/ws`;

    function connect() {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = handleMessage;
    }

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [handleMessage]);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  const progress =
    stats.total > 0 ? Math.round(((stats.sent + stats.failed) / stats.total) * 100) : 0;

  // ETA calculation
  const processed = stats.sent + stats.failed;
  const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
  const avgPerMsg = processed > 0 ? elapsed / processed : 0;
  const eta = avgPerMsg * stats.pending;

  const isActive = stats.total > 0 && stats.pending > 0;
  const isComplete = stats.total > 0 && stats.pending === 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-semibold">Monitor de Campana</h1>
          <p className="text-muted-foreground">
            Progreso en tiempo real del envio masivo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              connected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm text-muted-foreground">
            {connected ? "Conectado" : "Desconectado"}
          </span>
        </div>
      </div>

      {/* Empty state */}
      {events.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Radio className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay campana activa</h3>
            <p className="text-muted-foreground max-w-md">
              Inicia un envio masivo para ver el progreso aqui. Los mensajes
              enviados y fallidos se mostraran en tiempo real.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats + Progress when active */}
      {events.length > 0 && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total
                </CardTitle>
                <Send className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {stats.total}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Enviados
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {stats.sent}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Fallidos
                </CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {stats.failed}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pendientes
                </CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">
                  {stats.pending}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress bar + ETA */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Progreso</CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{progress}%</span>
                  {isActive && (
                    <span>
                      ETA: {formatETA(eta)}
                    </span>
                  )}
                  {isComplete && (
                    <Badge variant="outline" className="border-green-500 text-green-600">
                      Completado
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-4 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Live log */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Activity className="h-4 w-4" />
                  Log en vivo
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {events.length} eventos
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div
                ref={logRef}
                className="h-80 overflow-y-auto rounded-lg border bg-muted/30 p-2 font-mono text-sm"
              >
                {events.map((evt, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 border-b border-border/50 px-2 py-1.5 last:border-0"
                  >
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="shrink-0 font-medium">
                      {maskPhone(evt.phone)}
                    </span>
                    {evt.status === "sent" ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        Enviado
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Fallido</Badge>
                    )}
                    {evt.error && (
                      <span className="truncate text-xs text-red-500">
                        {evt.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
