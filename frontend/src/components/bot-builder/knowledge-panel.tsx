"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse, BotAiConfig } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Save,
  Sparkles,
  Building2,
  HelpCircle,
  Database,
  FileText,
  Trash2,
  Plus,
  X,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

type KnowledgeTab = "prompts" | "business" | "faqs" | "datasources";

export function KnowledgePanel() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<KnowledgeTab>("prompts");

  const { data: configData } = useQuery({
    queryKey: ["ai-config"],
    queryFn: () => api.get<ApiResponse<BotAiConfig>>("/bot-builder/ai-config"),
  });

  const config = configData?.data;
  const [form, setForm] = useState<Partial<BotAiConfig>>({});
  const merged = { ...config, ...form } as BotAiConfig;

  const setField = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      api.put<ApiResponse<BotAiConfig>>("/bot-builder/ai-config", {
        systemPrompt: merged.systemPrompt,
        businessInfo: merged.businessInfo,
        faqs: merged.faqs,
        activationKeywords: merged.activationKeywords,
        supportNumber: merged.supportNumber,
        ragFiles: merged.ragFiles,
        ragEnabled: merged.ragEnabled,
      }),
    onSuccess: () => {
      toast.success("Conocimiento guardado");
      setForm({});
      queryClient.invalidateQueries({ queryKey: ["ai-config"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addRagFile = (name: string, content: string) => {
    const current = merged.ragFiles || [];
    setField("ragFiles", [...current, { name, content }]);
  };

  const removeRagFile = (index: number) => {
    const current = merged.ragFiles || [];
    setField("ragFiles", current.filter((_: any, i: number) => i !== index));
  };

  const tabs = [
    { id: "prompts" as KnowledgeTab, label: "Prompts", icon: Sparkles },
    { id: "business" as KnowledgeTab, label: "Info Negocio", icon: Building2 },
    { id: "faqs" as KnowledgeTab, label: "FAQs", icon: HelpCircle },
    { id: "datasources" as KnowledgeTab, label: "Fuentes Datos", icon: Database },
  ];

  return (
    <div className="space-y-4">
      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {saveMutation.isPending ? "Guardando..." : "Guardar Conocimiento"}
        </Button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* PROMPTS TAB */}
      {activeTab === "prompts" && (
        <div className="space-y-6">
          {/* 1. System Prompt */}
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2">
                <span className="text-lg">1.</span> Prompt del Sistema (Personalidad del Bot)
              </h3>
              <p className="text-sm text-muted-foreground">
                Define quien es el bot, su tono, personalidad y reglas generales de comportamiento.
              </p>
            </div>
            <Textarea
              placeholder="Eres un asistente experto en ventas. Tu nombre es Luna. Eres amable, profesional y siempre buscas ayudar al cliente..."
              value={merged.systemPrompt || ""}
              onChange={(e) => setField("systemPrompt", e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          {/* Activation Keywords */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Palabras Clave de Activacion (Opcional)</h4>
            <Input
              placeholder="pedido, informacion, ayuda (vacio = responder a todo)"
              value={merged.activationKeywords || ""}
              onChange={(e) => setField("activationKeywords", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Separadas por coma. Si esta vacio, el bot responde a todos los mensajes.
            </p>
          </div>

          {/* Support Number */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Numero de Soporte Humano (Opcional)</h4>
            <Input
              placeholder="573001234567"
              value={merged.supportNumber || ""}
              onChange={(e) => setField("supportNumber", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Numero al que se transfiere cuando el bot no puede ayudar.
            </p>
          </div>
        </div>
      )}

      {/* BUSINESS INFO TAB */}
      {activeTab === "business" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              <span className="text-lg">2.</span> Informacion del Negocio/Servicio
            </h3>
            <p className="text-sm text-muted-foreground">
              Copia y pega aqui: Horarios, Direcciones, Precios base, Descripcion de servicios, metodos de pago, etc.
            </p>
          </div>
          <Textarea
            placeholder={`Horario de atencion: Lunes a Viernes 9am - 6pm, Sabados 9am - 2pm\nDireccion: Calle 123 #45-67, Centro\nEnvios: A todo el pais, 2-3 dias habiles\nMetodos de pago: Efectivo, Tarjeta, Transferencia...`}
            value={merged.businessInfo || ""}
            onChange={(e) => setField("businessInfo", e.target.value)}
            rows={12}
            className="font-mono text-sm"
          />
        </div>
      )}

      {/* FAQS TAB */}
      {activeTab === "faqs" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              <span className="text-lg">3.</span> Preguntas Frecuentes (FAQs)
            </h3>
            <p className="text-sm text-muted-foreground">
              Lista de preguntas y respuestas comunes que los clientes suelen hacer.
            </p>
          </div>
          <Textarea
            placeholder={`P: Tienen envios?\nR: Si, hacemos envios a todo el pais. El costo depende de la ciudad...\n\nP: Aceptan tarjetas?\nR: Si, aceptamos todas las tarjetas de credito y debito...\n\nP: Cual es el horario?\nR: Lunes a Viernes 9am - 6pm, Sabados 9am - 2pm`}
            value={merged.faqs || ""}
            onChange={(e) => setField("faqs", e.target.value)}
            rows={12}
            className="font-mono text-sm"
          />
        </div>
      )}

      {/* DATA SOURCES (RAG) TAB */}
      {activeTab === "datasources" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Fuentes de Datos (RAG)</h3>
              <p className="text-sm text-muted-foreground">
                Activa para que la IA use documentos y archivos como fuente de conocimiento adicional.
              </p>
            </div>
            <button
              onClick={() => setField("ragEnabled", !merged.ragEnabled)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                merged.ragEnabled ? "bg-emerald-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow ${
                  merged.ragEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {merged.ragEnabled && (
            <>
              {/* Existing RAG files */}
              {(merged.ragFiles || []).length > 0 && (
                <div className="space-y-2">
                  {(merged.ragFiles || []).map((file: { name: string; content: string }, i: number) => (
                    <Card key={i}>
                      <CardContent className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {file.content.length} caracteres
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeRagFile(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <AddRagFileForm onAdd={addRagFile} />
            </>
          )}

          {!merged.ragEnabled && (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Activa las fuentes de datos para agregar documentos</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Sub-component for adding RAG files
function AddRagFileForm({ onAdd }: { onAdd: (name: string, content: string) => void }) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [show, setShow] = useState(false);

  if (!show) {
    return (
      <Button variant="outline" onClick={() => setShow(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Agregar fuente de datos
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Nueva fuente de datos</h4>
          <Button variant="ghost" size="icon" onClick={() => setShow(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Input
          placeholder="Nombre (ej: Catalogo de productos, Manual de servicio)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Textarea
          placeholder="Pega aqui la informacion..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShow(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (!name.trim() || !content.trim()) return toast.error("Completa nombre y contenido");
              onAdd(name.trim(), content.trim());
              setName("");
              setContent("");
              setShow(false);
              toast.success("Fuente agregada (guarda para aplicar)");
            }}
          >
            Agregar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
