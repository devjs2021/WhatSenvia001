"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse, WhatsAppSession } from "@/types";
import { toast } from "sonner";
import {
  Send,
  MessageSquare,
  Phone,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardCard, DashboardCardHeader, DashboardCardTitle, DashboardCardDescription } from "@/components/ui/dashboard-card";

interface TestResult {
  success: boolean;
  message: string;
  messageId?: string;
  timestamp?: string;
  details?: string;
}

export default function TestWhatsAppPage() {
  const [sessionId, setSessionId] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<TestResult[]>([]);

  const { data: sessionsData } = useQuery({
    queryKey: ["whatsapp-sessions"],
    queryFn: () => api.get<ApiResponse<WhatsAppSession[]>>("/whatsapp/sessions"),
  });

  const sessions = (sessionsData?.data || []).filter((s) => s.status === "connected");

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<TestResult>>("/whatsapp/test-send", {
        sessionId,
        phone: phone.trim(),
        message: message.trim(),
      });
      return res.data;
    },
    onSuccess: (data) => {
      setResults((prev) => [data, ...prev]);
      if (data.success) {
        toast.success("Mensaje enviado exitosamente");
      } else {
        toast.error(data.message);
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) { toast.error("Selecciona una sesion"); return; }
    if (!phone.trim()) { toast.error("Ingresa un numero de telefono"); return; }
    if (!message.trim()) { toast.error("Ingresa un mensaje"); return; }
    testMutation.mutate();
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <DashboardHeader
        title={
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Probar WhatsApp
          </div>
        }
        description="Envia mensajes de prueba para verificar la conexion de tus sesiones"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Send form */}
        <DashboardCard>
          <DashboardCardHeader>
            <DashboardCardTitle>Enviar Mensaje de Prueba</DashboardCardTitle>
            <DashboardCardDescription>
              Verifica que tu sesion de WhatsApp esta funcionando correctamente
            </DashboardCardDescription>
          </DashboardCardHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                Sesion de WhatsApp
              </label>
              <select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer w-full"
              >
                <option value="">Selecciona una sesion...</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.connectionType === "meta_cloud" ? "Meta" : "WhatsApp"} · {s.phone || s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                Numero de destino
              </label>
              <input
                placeholder="Ej: 573001234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 w-full"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                Mensaje
              </label>
              <textarea
                placeholder="Escribe tu mensaje de prueba..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 w-full"
              />
            </div>

            <button
              type="submit"
              disabled={testMutation.isPending || !sessionId || !phone.trim() || !message.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {testMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {testMutation.isPending ? "Enviando..." : "Enviar Mensaje de Prueba"}
            </button>
          </form>
        </DashboardCard>

        {/* Results */}
        <DashboardCard>
          <DashboardCardHeader>
            <DashboardCardTitle>
              Historial de Pruebas
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 ml-2">
                {results.length}
              </span>
            </DashboardCardTitle>
            <DashboardCardDescription>
              Resultados de los ultimos mensajes de prueba enviados
            </DashboardCardDescription>
          </DashboardCardHeader>

          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Send className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">Aun no has enviado mensajes de prueba</p>
              <p className="text-xs text-slate-300 mt-1">
                Usa el formulario para enviar tu primer mensaje
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result, i) => (
                <div
                  key={i}
                  className={`rounded-2xl border p-3 ${
                    result.success
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      {result.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                      )}
                      <div>
                        <p className={`text-sm font-medium ${result.success ? "text-emerald-800" : "text-red-800"}`}>
                          {result.success ? "Enviado exitosamente" : "Error al enviar"}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{result.message}</p>
                        {result.messageId && (
                          <p className="text-xs text-slate-400 mt-0.5 font-mono">
                            ID: {result.messageId}
                          </p>
                        )}
                        {result.details && (
                          <p className="text-xs text-slate-400 mt-0.5">{result.details}</p>
                        )}
                      </div>
                    </div>
                    {result.timestamp && (
                      <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
                        <Clock className="h-3 w-3" />
                        {new Date(result.timestamp).toLocaleTimeString("es-CO", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>

      {/* Connected sessions info */}
      <DashboardCard>
        <DashboardCardHeader>
          <DashboardCardTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Sesiones Conectadas
          </DashboardCardTitle>
        </DashboardCardHeader>
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">
            No hay sesiones de WhatsApp conectadas. Conecta una desde la pestana WhatsApp.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sessions.map((s) => (
              <div key={s.id} className={`rounded-2xl border p-3 flex items-center gap-3 ${
                s.connectionType === "meta_cloud" ? "border-blue-200 bg-blue-50/30" : "border-emerald-200 bg-emerald-50/30"
              }`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  s.connectionType === "meta_cloud" ? "bg-blue-50" : "bg-emerald-50"
                }`}>
                  <CheckCircle2 className={`h-4 w-4 ${
                    s.connectionType === "meta_cloud" ? "text-blue-500" : "text-emerald-500"
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {s.connectionType === "meta_cloud" ? "Meta" : "WhatsApp"} · {s.phone || s.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardCard>
    </div>
  );
}
