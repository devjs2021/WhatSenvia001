"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse, PollCampaign, PollResults } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      // Download phones for specific option
      const phones = results.optionPhones[option] || [];
      for (const phone of phones) {
        const resp = results.responses.find(
          (r) => r.phone === phone && r.selectedOptions.includes(option)
        );
        csv += `${phone},"${option}",${resp?.respondedAt || ""}\n`;
      }
    } else {
      // Download all responses
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-semibold">Resultados de Encuestas</h1>
          <p className="text-muted-foreground">Analiza las respuestas y segmenta tu audiencia</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["poll-campaigns"] });
            if (selectedCampaignId) {
              queryClient.invalidateQueries({ queryKey: ["poll-results", selectedCampaignId] });
            }
          }}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Left sidebar - Campaign list */}
        <div className="w-full md:w-72 space-y-2">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
            Campanas Recientes
          </h3>

          {isLoading && <p className="text-sm text-muted-foreground p-2">Cargando...</p>}

          {!isLoading && campaigns.length === 0 && (
            <p className="text-sm text-muted-foreground p-2">
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
              className={`w-full text-left rounded-lg border p-3 transition-colors ${
                selectedCampaignId === campaign.id
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted"
              }`}
            >
              <p className="text-sm font-medium line-clamp-2">{campaign.question}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {campaign.totalSent} enviadas
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-xs ${campaign.totalResponses > 0 ? "text-emerald-600 border-emerald-300" : ""}`}
                >
                  {campaign.totalResponses} respuestas
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
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
            <div className="flex items-center justify-center h-96 text-muted-foreground">
              Selecciona una campana para ver los resultados
            </div>
          )}

          {selectedCampaignId && results && (
            <div className="space-y-6">
              {/* Question header */}
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">{results.question}</h2>
                      <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
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
                      <Button variant="outline" size="sm" onClick={() => downloadCSV()}>
                        <Download className="h-4 w-4 mr-1" />
                        Descargar Todo
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm("Eliminar esta encuesta y todos sus resultados?"))
                            deleteMutation.mutate(results.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bar chart */}
              <Card>
                <CardContent className="py-6">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Resultados
                  </h3>
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
                          className={`w-full text-left rounded-lg p-3 border transition-colors ${
                            isSelected ? "border-primary bg-primary/5" : "hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{option}</span>
                            <span className="text-sm text-muted-foreground">
                              {count} votos ({pct}%)
                            </span>
                          </div>
                          <div className="h-6 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${COLORS[i % COLORS.length]}`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Selected option detail - phones */}
              {selectedOption && (
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold">
                        Numeros que eligieron: &quot;{selectedOption}&quot;
                        <Badge variant="secondary" className="ml-2">
                          {phonesForOption.length}
                        </Badge>
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyPhones(phonesForOption)}
                          disabled={phonesForOption.length === 0}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          Copiar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadCSV(selectedOption)}
                          disabled={phonesForOption.length === 0}
                        >
                          <Download className="h-3.5 w-3.5 mr-1" />
                          CSV
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => savePhones(phonesForOption, selectedOption)}
                          disabled={phonesForOption.length === 0}
                        >
                          <Save className="h-3.5 w-3.5 mr-1" />
                          Guardar
                        </Button>
                      </div>
                    </div>

                    {phonesForOption.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        Nadie ha seleccionado esta opcion aun
                      </p>
                    ) : (
                      <div className="max-h-60 overflow-y-auto border rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 sticky top-0">
                            <tr>
                              <th className="text-left px-3 py-2 font-medium">#</th>
                              <th className="text-left px-3 py-2 font-medium">Telefono</th>
                              <th className="text-left px-3 py-2 font-medium">Fecha</th>
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
                                <tr key={idx} className="border-t hover:bg-muted/30">
                                  <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                                  <td className="px-3 py-2 font-mono">{phone}</td>
                                  <td className="px-3 py-2 text-muted-foreground">
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
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
