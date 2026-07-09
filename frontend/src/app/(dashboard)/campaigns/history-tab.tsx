"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, downloadFile } from "@/lib/api";
import type { PaginatedResponse, Campaign } from "@/types";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { toast } from "sonner";
import { Download, History, Users, Send, XCircle, Loader2, Ban } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-500 border-slate-200",
  scheduled: "bg-amber-50 text-amber-600 border-amber-200",
  running: "bg-blue-50 text-blue-600 border-blue-200",
  paused: "bg-amber-50 text-amber-600 border-amber-200",
  completed: "bg-emerald-50 text-emerald-600 border-emerald-200",
  failed: "bg-red-50 text-red-600 border-red-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  scheduled: "Programada",
  running: "Enviando",
  paused: "Pausada",
  completed: "Completada",
  failed: "Fallida",
  cancelled: "Cancelada",
};

const CANCELLABLE_STATUSES = new Set(["running", "scheduled", "paused"]);

export default function HistoryTab() {
  const queryClient = useQueryClient();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["campaigns-history"],
    queryFn: () => api.get<PaginatedResponse<Campaign>>("/campaigns?limit=50"),
    refetchInterval: 5000,
  });

  const campaigns = data?.data || [];

  async function handleDownload(campaign: Campaign) {
    setDownloadingId(campaign.id);
    try {
      await downloadFile(`/campaigns/${campaign.id}/report`, `reporte-${campaign.name}.xlsx`);
    } catch (err: any) {
      toast.error(err.message || "No se pudo descargar el reporte");
    } finally {
      setDownloadingId(null);
    }
  }

  const cancelMutation = useMutation({
    mutationFn: (campaignId: string) => api.post(`/campaigns/${campaignId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns-history"] });
      toast.success("Envío cancelado");
    },
    onError: (err: any) => toast.error(err.message || "No se pudo cancelar el envío"),
  });

  function handleCancel(campaign: Campaign) {
    const pending = campaign.totalContacts - campaign.sentCount - campaign.failedCount;
    if (!confirm(`¿Cancelar el envío de "${campaign.name}"? Quedan ${pending} contacto(s) sin enviar — a esos ya no se les mandará nada.`)) {
      return;
    }
    cancelMutation.mutate(campaign.id);
  }

  if (isLoading) {
    return <div className="text-center py-12 text-slate-400">Cargando historial...</div>;
  }

  if (campaigns.length === 0) {
    return (
      <DashboardCard>
        <div className="py-12 text-center">
          <History className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          <p className="font-medium text-slate-800">Aún no hay campañas enviadas</p>
          <p className="text-sm text-slate-400 mt-1">
            Cuando envíes una campaña, aparecerá aquí con su reporte descargable.
          </p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <div className="space-y-3">
      {campaigns.map((c) => {
        const hasResults = c.sentCount + c.failedCount > 0;
        const isDownloading = downloadingId === c.id;
        return (
          <DashboardCard key={c.id}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-slate-800 truncate">{c.name}</h3>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      STATUS_STYLES[c.status] || "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {STATUS_LABELS[c.status] || c.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {c.totalContacts} contactos
                  </span>
                  <span className="flex items-center gap-1">
                    <Send className="h-3.5 w-3.5" />
                    {c.sentCount} enviados
                  </span>
                  {c.failedCount > 0 && (
                    <span className="flex items-center gap-1 text-red-500">
                      <XCircle className="h-3.5 w-3.5" />
                      {c.failedCount} fallidos
                    </span>
                  )}
                  <span>{new Date(c.createdAt).toLocaleString("es-CO")}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {CANCELLABLE_STATUSES.has(c.status) && (
                  <button
                    onClick={() => handleCancel(c)}
                    disabled={cancelMutation.isPending}
                    title="Cancelar envío"
                    className="flex items-center gap-2 border border-red-200 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed text-red-600 rounded-xl px-4 py-2 text-sm font-medium transition-all"
                  >
                    {cancelMutation.isPending && cancelMutation.variables === c.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Ban className="h-4 w-4" />
                    )}
                    Cancelar envío
                  </button>
                )}
                <button
                  onClick={() => handleDownload(c)}
                  disabled={!hasResults || isDownloading}
                  title={hasResults ? "Descargar reporte" : "Esta campaña aún no tiene envíos"}
                  className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 rounded-xl px-4 py-2 text-sm font-medium transition-all"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Descargar reporte
                </button>
              </div>
            </div>
          </DashboardCard>
        );
      })}
    </div>
  );
}
