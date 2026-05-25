"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse, PollCampaign, PollResults } from "@/types";
import { toast } from "sonner";
import {
  BarChart3,
  RefreshCw,
  Download,
  Users,
  CheckCircle2,
  Save,
  Copy,
  Trash2,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardCard, DashboardCardHeader, DashboardCardTitle, DashboardCardDescription } from "@/components/ui/dashboard-card";

export default function PollResultsPage() {
  const queryClient = useQueryClient();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // List all poll campaigns
  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ["poll-campaigns"],
    queryFn: () => api.get<ApiResponse<PollCampaign[]>>("/polls"),
  });

  // Get results for selected campaign
  const { data: resultsData } = useQuery({
    queryKey: ["poll-results", selectedCampaignId],
    queryFn: () => api.get<ApiResponse<PollResults>>(`/polls/${selectedCampaignId}/results`),
    enabled: !!selectedCampaignId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/polls/${id}`),
    onSuccess: () => {
      toast.success("Encuesta eliminada");
      setSelectedCampaignId(null);
      queryClient.invalidateQueries({ queryKey: ["poll-campaigns"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const campaigns = campaignsData?.data || [];
  const results = resultsData?.data;

  // Calculate bar chart data
  const maxVotes = results
    ? Math.max(...Object.values(results.optionCounts), 1)
    : 1;

  // Get phones for selected option
  const phonesForOption = selectedOption && results
    ? results.optionPhones[selectedOption] || []
    : [];

  // Download CSV
  const downloadCSV = (option?: string) => {
    if (!results) return;

    let csv = "Telefono,Opcion Seleccionada,Fecha Respuesta\n";

    if (option) {
      const phones = results.optionPhones[option] || [];
      for (const phone of phones) {
        const resp = results.responses.find(
          (r) => r.phone === phone && r.selectedOptions.includes(option)
        );
        csv += `${phone},"${option}",${resp?.respondedAt || ""}\n`;
      }
    } else {
      for (const resp of results.responses) {
        csv += `${resp.phone},"${resp.selectedOptions.join(", ")}",${resp.respondedAt}\n`;
      }
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = option
      ? `encuesta_${option.replace(/\s/g, "_")}.csv`
      : `encuesta_resultados_${results.id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV descargado");
  };

  // Copy phones to clipboard
  const copyPhones = (phones: string[]) => {
    navigator.clipboard.writeText(phones.join("\n"));
    toast.success(`${phones.length} numeros copiados`);
  };

  // Save phones as contacts (placeholder - copies for now)
  const savePhones = (phones: string[], tag: string) => {
    navigator.clipboard.writeText(phones.join("\n"));
    toast.success(`${phones.length} numeros copiados (guardar como contactos proximamente)`);
  };

  const COLORS = [
    "bg-emerald-500",
    "bg-blue-500",
    "bg-amber-500",
    "bg-purple-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-orange-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-pink-500",
    "bg-lime-500",
    "bg-fuchsia-500",
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <DashboardHeader
        title="Resultados de Encuestas"
        description="Analiza las respuestas y segmenta tu audiencia"
      >
        <button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["poll-campaigns"] });
            if (selectedCampaignId) {
              queryClient.invalidateQueries({ queryKey: ["poll-results", selectedCampaignId] });
            }
          }}
          className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </DashboardHeader>

      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Left sidebar - Campaign list */}
        <div className="w-full md:w-72 space-y-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Campanas Recientes
          </h3>

          {isLoading && <p className="text-sm text-slate-400 p-2">Cargando...</p>}

          {!isLoading && campaigns.length === 0 && (
            <p className="text-sm text-slate-400 p-2">
              No hay campanas de encuestas registradas.
            </p>
          )}

          {campaigns.map((campaign) => (
            <button
              key={campaign.id}
              onClick={() => {
                setSelectedCampaignId(campaign.id);
                setSelectedOption(null);
              }}
              className={`w-full text-left rounded-2xl border p-3 transition-colors ${
                selectedCampaignId === campaign.id
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-100 hover:bg-slate-50"
              }`}
            >
              <p className="text-sm font-medium text-slate-800 line-clamp-2">{campaign.question}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                  {campaign.totalSent} enviadas
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    campaign.totalResponses > 0 ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {campaign.totalResponses} respuestas
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {new Date(campaign.createdAt).toLocaleDateString("es-CO", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </button>
          ))}
        </div>

        {/* Right content - Results */}
        <div className="flex-1 min-w-0">
          {!selectedCampaignId && (
            <div className="flex items-center justify-center h-96 text-slate-400">
              Selecciona una campana para ver los resultados
            </div>
          )}

          {selectedCampaignId && results && (
            <div className="space-y-6">
              {/* Question header */}
              <DashboardCard>
                <DashboardCardHeader>
                  <div>
                    <DashboardCardTitle>{results.question}</DashboardCardTitle>
                    <div className="flex gap-4 mt-1 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {results.totalSent} enviadas
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {results.totalResponses} respuestas
                      </span>
                      <span>
                        {results.totalSent > 0
                          ? `${Math.round((results.totalResponses / results.totalSent) * 100)}% tasa de respuesta`
                          : "0%"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadCSV()}
                      className="border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl px-4 py-2 text-sm font-medium transition-all flex items-center gap-1"
                    >
                      <Download className="h-4 w-4" />
                      Descargar Todo
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Eliminar esta encuesta y todos sus resultados?"))
                          deleteMutation.mutate(results.id);
                      }}
                      className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </DashboardCardHeader>
              </DashboardCard>

              {/* Bar chart */}
              <DashboardCard>
                <DashboardCardHeader>
                  <DashboardCardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Resultados
                  </DashboardCardTitle>
                </DashboardCardHeader>
                <div className="space-y-3">
                  {(results.options as string[]).map((option, i) => {
                    const count = results.optionCounts[option] || 0;
                    const pct = results.totalResponses > 0
                      ? Math.round((count / results.totalResponses) * 100)
                      : 0;
                    const barWidth = maxVotes > 0 ? (count / maxVotes) * 100 : 0;
                    const isSelected = selectedOption === option;

                    return (
                      <button
                        key={`${option}-${i}`}
                        onClick={() => setSelectedOption(isSelected ? null : option)}
                        className={`w-full text-left rounded-2xl p-3 border transition-colors ${
                          isSelected ? "border-emerald-500 bg-emerald-50" : "border-slate-100 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-800">{option}</span>
                          <span className="text-sm text-slate-400">
                            {count} votos ({pct}%)
                          </span>
                        </div>
                        <div className="h-6 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${COLORS[i % COLORS.length]}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </DashboardCard>

              {/* Selected option detail - phones */}
              {selectedOption && (
                <DashboardCard>
                  <DashboardCardHeader>
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <DashboardCardTitle>
                          Numeros que eligieron: "{selectedOption}"
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 ml-2">
                            {phonesForOption.length}
                          </span>
                        </DashboardCardTitle>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyPhones(phonesForOption)}
                          disabled={phonesForOption.length === 0}
                          className="border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-1"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copiar
                        </button>
                        <button
                          onClick={() => downloadCSV(selectedOption)}
                          disabled={phonesForOption.length === 0}
                          className="border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-1"
                        >
                          <Download className="h-3.5 w-3.5" />
                          CSV
                        </button>
                        <button
                          onClick={() => savePhones(phonesForOption, selectedOption)}
                          disabled={phonesForOption.length === 0}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-1"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Guardar
                        </button>
                      </div>
                    </div>
                  </DashboardCardHeader>

                  {phonesForOption.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4 text-center">
                      Nadie ha seleccionado esta opcion aun
                    </p>
                  ) : (
                    <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-2xl">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50/50 sticky top-0">
                          <tr>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">#</th>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Telefono</th>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {phonesForOption.map((phone, idx) => {
                            const resp = results.responses.find(
                              (r) =>
                                r.phone === phone &&
                                r.selectedOptions.includes(selectedOption!)
                            );
                            return (
                              <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50/30">
                                <td className="px-3 py-2 text-xs text-slate-400">{idx + 1}</td>
                                <td className="px-3 py-2 font-mono text-sm text-slate-600">{phone}</td>
                                <td className="px-3 py-2 text-xs text-slate-400">
                                  {resp?.respondedAt
                                    ? new Date(resp.respondedAt).toLocaleString("es-CO", {
                                        day: "numeric",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "-"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </DashboardCard>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
