"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse, BotFlow, BotSettings, WhatsAppSession } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Bot,
  Plus,
  Play,
  Pause,
  Trash2,
  Copy,
  Edit3,
  Upload,
  Settings,
  Workflow,
  BookTemplate,
  Brain,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AiConfigPanel } from "@/components/bot-builder/ai-config-panel";
import { KnowledgePanel } from "@/components/bot-builder/knowledge-panel";

type Tab = "flows" | "templates" | "knowledge" | "ai-config";

const modeLabels: Record<string, { label: string; desc: string; icon: string }> = {
  ia_complete: {
    label: "Modo IA Completo",
    desc: "Toda la conversacion es manejada por la IA usando el conocimiento configurado. Ideal para chatbots inteligentes.",
    icon: "brain",
  },
  hybrid: {
    label: "Modo Hibrido (Recomendado)",
    desc: "Primero intenta usar los flujos del Bot Builder. Si no hay coincidencia, la IA responde automaticamente. Mejor de ambos mundos.",
    icon: "hybrid",
  },
  traditional: {
    label: "Modo Tradicional",
    desc: "Solo usa los flujos creados en el Bot Builder. La IA nunca interviene. Ideal para flujos especificos y control total.",
    icon: "flow",
  },
};

export default function BotBuilderPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("flows");
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFlowName, setNewFlowName] = useState("");
  const [showSessionPicker, setShowSessionPicker] = useState<string | null>(null);

  // Queries
  const { data: flowsData } = useQuery({
    queryKey: ["bot-flows"],
    queryFn: () => api.get<ApiResponse<BotFlow[]>>("/bot-builder/flows"),
  });

  const { data: templatesData } = useQuery({
    queryKey: ["bot-templates"],
    queryFn: () => api.get<ApiResponse<BotFlow[]>>("/bot-builder/templates"),
  });

  const { data: settingsData } = useQuery({
    queryKey: ["bot-settings"],
    queryFn: () => api.get<ApiResponse<BotSettings>>("/bot-builder/settings"),
  });

  const { data: statsData } = useQuery({
    queryKey: ["bot-stats"],
    queryFn: () => api.get<ApiResponse<{ total: number; active: number; inactive: number }>>("/bot-builder/stats"),
  });

  const { data: sessionsData } = useQuery({
    queryKey: ["whatsapp-sessions"],
    queryFn: () => api.get<ApiResponse<WhatsAppSession[]>>("/whatsapp/sessions"),
  });

  const sessions = (sessionsData?.data || []).filter((s) => s.status === "connected");

  const flows = flowsData?.data || [];
  const templates = templatesData?.data || [];
  const settings = settingsData?.data;
  const stats = statsData?.data;

  // Mutations
  const createFlowMutation = useMutation({
    mutationFn: (name: string) => api.post<ApiResponse<BotFlow>>("/bot-builder/flows", { name }),
    onSuccess: (data) => {
      toast.success("Flujo creado");
      queryClient.invalidateQueries({ queryKey: ["bot-flows"] });
      queryClient.invalidateQueries({ queryKey: ["bot-stats"] });
      setShowCreateDialog(false);
      setNewFlowName("");
      router.push(`/bot-builder/editor/${data.data.id}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteFlowMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/bot-builder/flows/${id}`),
    onSuccess: () => {
      toast.success("Flujo eliminado");
      queryClient.invalidateQueries({ queryKey: ["bot-flows"] });
      queryClient.invalidateQueries({ queryKey: ["bot-stats"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const duplicateFlowMutation = useMutation({
    mutationFn: (id: string) => api.post<ApiResponse<BotFlow>>(`/bot-builder/flows/${id}/duplicate`),
    onSuccess: () => {
      toast.success("Flujo duplicado");
      queryClient.invalidateQueries({ queryKey: ["bot-flows"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleFlowMutation = useMutation({
    mutationFn: ({ id, sessionId }: { id: string; sessionId?: string }) =>
      api.post<ApiResponse<BotFlow>>(`/bot-builder/flows/${id}/toggle`, sessionId ? { sessionId } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-flows"] });
      queryClient.invalidateQueries({ queryKey: ["bot-stats"] });
      setShowSessionPicker(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  function handleToggleFlow(flow: BotFlow) {
    if (flow.status === "active") {
      toggleFlowMutation.mutate({ id: flow.id });
    } else {
      if (sessions.length === 0) {
        toast.error("No hay numeros de WhatsApp conectados. Conecta uno primero.");
        return;
      }
      if (sessions.length === 1) {
        toggleFlowMutation.mutate({ id: flow.id, sessionId: sessions[0].id });
      } else {
        setShowSessionPicker(flow.id);
      }
    }
  }

  const updateSettingsMutation = useMutation({
    mutationFn: (mode: string) => api.put<ApiResponse<BotSettings>>("/bot-builder/settings", { mode }),
    onSuccess: () => {
      toast.success("Configuracion actualizada");
      queryClient.invalidateQueries({ queryKey: ["bot-settings"] });
      setShowSettings(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createFromTemplateMutation = useMutation({
    mutationFn: ({ templateId, name }: { templateId: string; name: string }) =>
      api.post<ApiResponse<BotFlow>>("/bot-builder/from-template", { templateId, name }),
    onSuccess: (data) => {
      toast.success("Flujo creado desde plantilla");
      queryClient.invalidateQueries({ queryKey: ["bot-flows"] });
      router.push(`/bot-builder/editor/${data.data.id}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const currentMode = settings?.mode || "hybrid";
  const modeInfo = modeLabels[currentMode];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Bot Builder</h1>
            <p className="text-muted-foreground">Crea flujos visuales para automatizar conversaciones en WhatsApp</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-3 py-1">
            <Bot className="h-3 w-3 mr-1" />
            {modeInfo?.label.split(" ")[1] || "Hibrido"}
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            {stats?.active || 0} activos · {stats?.total || 0} sesiones
          </Badge>
          <Button variant="outline" size="icon" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => toast.info("Funcion de importar en desarrollo")}>
            <Upload className="mr-2 h-4 w-4" />
            Importar Flujo
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Crear Flujo
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={tab === "flows" ? "default" : "outline"}
          onClick={() => setTab("flows")}
          className="gap-2"
        >
          <Workflow className="h-4 w-4" />
          Mis Flujos
        </Button>
        <Button
          variant={tab === "templates" ? "default" : "outline"}
          onClick={() => setTab("templates")}
          className="gap-2"
        >
          <BookTemplate className="h-4 w-4" />
          Plantillas
        </Button>
        <Button
          variant={tab === "knowledge" ? "default" : "outline"}
          onClick={() => setTab("knowledge")}
          className="gap-2"
        >
          <Brain className="h-4 w-4" />
          Conocimiento IA
        </Button>
        <Button
          variant={tab === "ai-config" ? "default" : "outline"}
          onClick={() => setTab("ai-config")}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          Configuracion IA
        </Button>
      </div>

      {/* Tab Content */}
      {tab === "flows" && (
        <div>
          {flows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Bot className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No tienes flujos creados</h3>
              <p className="text-muted-foreground mt-1 mb-6">Crea tu primer flujo o usa una plantilla para comenzar</p>
              <div className="flex gap-3">
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Flujo
                </Button>
                <Button variant="outline" onClick={() => setTab("templates")}>
                  <BookTemplate className="mr-2 h-4 w-4" />
                  Ver Plantillas
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flows.map((flow) => (
                <Card key={flow.id} className="group hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{flow.name}</CardTitle>
                      <Badge
                        variant={flow.status === "active" ? "default" : "secondary"}
                        className={flow.status === "active" ? "bg-emerald-500" : ""}
                      >
                        {flow.status === "active" ? "Activo" : flow.status === "draft" ? "Borrador" : "Inactivo"}
                      </Badge>
                    </div>
                    {flow.description && (
                      <p className="text-sm text-muted-foreground">{flow.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    {flow.status === "active" && flow.sessionId && (() => {
                      const session = (sessionsData?.data || []).find((s) => s.id === flow.sessionId);
                      return session ? (
                        <p className="text-xs text-emerald-600 mb-1">
                          Asignado a: {session.phone || session.name}
                        </p>
                      ) : null;
                    })()}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {flow.nodes?.length || 0} nodos · Editado {new Date(flow.updatedAt).toLocaleDateString("es-CO")}
                      </p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggleFlow(flow)}
                          title={flow.status === "active" ? "Desactivar" : "Activar"}
                        >
                          {flow.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => router.push(`/bot-builder/editor/${flow.id}`)}
                          title="Editar"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => duplicateFlowMutation.mutate(flow.id)}
                          title="Duplicar"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => {
                            if (confirm("Eliminar este flujo?")) deleteFlowMutation.mutate(flow.id);
                          }}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "templates" && (
        <div>
          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <BookTemplate className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No hay plantillas disponibles</h3>
              <p className="text-muted-foreground mt-1">Las plantillas se agregaran proximamente</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tmpl) => (
                <Card key={tmpl.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-base">{tmpl.name}</CardTitle>
                    {tmpl.description && (
                      <p className="text-sm text-muted-foreground">{tmpl.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() =>
                        createFromTemplateMutation.mutate({ templateId: tmpl.id, name: `${tmpl.name} - Mi version` })
                      }
                    >
                      Usar plantilla
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "knowledge" && <KnowledgePanel />}

      {tab === "ai-config" && <AiConfigPanel />}

      {/* Create Flow Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateDialog(false)}>
          <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Crear nuevo flujo</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowCreateDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Input
              placeholder="Nombre del flujo (ej: Bienvenida Simple)"
              value={newFlowName}
              onChange={(e) => setNewFlowName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newFlowName.trim()) createFlowMutation.mutate(newFlowName.trim());
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
              <Button
                onClick={() => newFlowName.trim() && createFlowMutation.mutate(newFlowName.trim())}
                disabled={!newFlowName.trim() || createFlowMutation.isPending}
              >
                Crear
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bot Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSettings(false)}>
          <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuracion del Bot
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Selecciona como debe comportarse el bot cuando recibe mensajes:
            </p>
            <div className="space-y-3">
              {(["ia_complete", "hybrid", "traditional"] as const).map((mode) => {
                const info = modeLabels[mode];
                const isSelected = currentMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => updateSettingsMutation.mutate(mode)}
                    className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
                        : "border-muted hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{info.label}</span>
                      {isSelected && (
                        <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{info.desc}</p>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Tip: Configura el conocimiento de la IA en la pestana &quot;Conocimiento IA&quot; cuando actives el modo IA o Hibrido.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Session Picker Modal */}
      {showSessionPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSessionPicker(null)}>
          <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Seleccionar numero</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowSessionPicker(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Elige a que numero de WhatsApp deseas asignar este flujo:
            </p>
            <div className="space-y-2">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => toggleFlowMutation.mutate({ id: showSessionPicker, sessionId: session.id })}
                  className="w-full flex items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{session.name}</p>
                    {session.phone && <p className="text-xs text-muted-foreground">{session.phone}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
