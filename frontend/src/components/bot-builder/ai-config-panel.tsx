"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse, BotAiConfig } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Settings,
  Play,
  Save,
  Eye,
  EyeOff,
  Send,
  Bot,
  Lightbulb,
  Wifi,
  WifiOff,
} from "lucide-react";

type ConfigTab = "connection" | "test";

interface Providers {
  [key: string]: {
    name: string;
    models: { id: string; name: string }[];
  };
}

export function AiConfigPanel() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ConfigTab>("connection");
  const [showApiKey, setShowApiKey] = useState(false);
  const [testMessages, setTestMessages] = useState<{ role: "user" | "bot"; text: string }[]>([]);
  const [testInput, setTestInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: configData } = useQuery({
    queryKey: ["ai-config"],
    queryFn: () => api.get<ApiResponse<BotAiConfig>>("/bot-builder/ai-config"),
  });

  const { data: providersData } = useQuery({
    queryKey: ["ai-providers"],
    queryFn: () => api.get<ApiResponse<Providers>>("/bot-builder/ai-config/providers"),
  });

  const config = configData?.data;
  const providers = providersData?.data || {};
  const [form, setForm] = useState<Partial<BotAiConfig>>({});
  const merged = { ...config, ...form } as BotAiConfig;
  const currentProvider = providers[merged?.provider || "google"];
  const models = currentProvider?.models || [];

  const setField = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Save connection
  const saveMutation = useMutation({
    mutationFn: () =>
      api.put<ApiResponse<BotAiConfig>>("/bot-builder/ai-config", {
        provider: merged.provider,
        model: merged.model,
        apiKey: merged.apiKey,
        botActive: merged.botActive,
      }),
    onSuccess: () => {
      toast.success("Conexion guardada");
      setForm({});
      queryClient.invalidateQueries({ queryKey: ["ai-config"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Test connection
  const testConnectionMutation = useMutation({
    mutationFn: () =>
      api.post<ApiResponse<{ success: boolean; message: string }>>("/bot-builder/ai-config/test", {
        provider: merged.provider,
        model: merged.model,
        apiKey: merged.apiKey,
      }),
    onSuccess: (data) => {
      if (data.data.success) toast.success(data.data.message);
      else toast.error(data.data.message);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Toggle bot
  const toggleBotMutation = useMutation({
    mutationFn: () =>
      api.put<ApiResponse<BotAiConfig>>("/bot-builder/ai-config", { botActive: !merged.botActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-config"] });
      toast.success(merged.botActive ? "Bot desactivado" : "Bot activado");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Chat test
  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      api.post<ApiResponse<{ response: string }>>("/bot-builder/ai-config/chat", { message }),
    onSuccess: (data) => {
      setTestMessages((prev) => [...prev, { role: "bot", text: data.data.response }]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    },
    onError: (err: any) => {
      setTestMessages((prev) => [...prev, { role: "bot", text: `Error: ${err.message}` }]);
    },
  });

  const handleSendTest = () => {
    if (!testInput.trim()) return;
    setTestMessages((prev) => [...prev, { role: "user", text: testInput }]);
    chatMutation.mutate(testInput);
    setTestInput("");
  };

  const tabs = [
    { id: "connection" as ConfigTab, label: "Conexion", icon: Settings },
    { id: "test" as ConfigTab, label: "Probar IA", icon: Play },
  ];

  return (
    <div className="flex gap-6">
      {/* Left sidebar */}
      <div className="w-48 space-y-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}

        {/* Tip */}
        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
          <Lightbulb className="h-3.5 w-3.5 mb-1" />
          El conocimiento del bot (prompts, FAQs, archivos) se configura en <strong>Bot Builder</strong> cuando activas el modo IA.
        </div>
      </div>

      {/* Right content */}
      <div className="flex-1 min-w-0">
        {/* Save button */}
        <div className="flex justify-end mb-4">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? "Guardando..." : "Guardar Conexion"}
          </Button>
        </div>

        {/* CONNECTION TAB */}
        {activeTab === "connection" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Proveedor y Modelo</h3>
              <p className="text-sm text-muted-foreground">Conecta tu bot a la inteligencia artificial</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Proveedor</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={merged.provider || "google"}
                  onChange={(e) => {
                    setField("provider", e.target.value);
                    const firstModel = providers[e.target.value]?.models[0]?.id;
                    if (firstModel) setField("model", firstModel);
                  }}
                >
                  {Object.entries(providers).map(([key, p]) => (
                    <option key={key} value={key}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Modelo</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={merged.model || ""}
                  onChange={(e) => setField("model", e.target.value)}
                >
                  {models.map((m: { id: string; name: string }) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    placeholder="Tu clave de API de gemini"
                    value={merged.apiKey || ""}
                    onChange={(e) => setField("apiKey", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  onClick={() => testConnectionMutation.mutate()}
                  disabled={testConnectionMutation.isPending || !merged.apiKey}
                >
                  {testConnectionMutation.isPending ? "Probando..." : "Probar"}
                </Button>
              </div>
            </div>

            {/* Tips */}
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="py-3">
                <p className="text-sm font-medium flex items-center gap-1 mb-1">
                  <Lightbulb className="h-4 w-4 text-amber-600" /> Consejos
                </p>
                <ul className="text-xs text-amber-700 space-y-1 ml-5 list-disc">
                  <li>
                    Usa <strong>Gemini 2.0 Flash</strong> para mejor rendimiento gratuito
                  </li>
                  <li>
                    Obten tu API Key gratis en <strong>aistudio.google.com</strong>
                  </li>
                  <li>
                    El conocimiento del bot se configura en <strong>Bot Builder &rarr; Conocimiento IA</strong>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Connection Status */}
            <Card>
              <CardContent className="py-4">
                <h4 className="font-semibold mb-3">Estado de la Conexion</h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleBotMutation.mutate()}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                        merged.botActive ? "bg-emerald-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow ${
                          merged.botActive ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <Badge
                      variant={merged.botActive ? "default" : "secondary"}
                      className={merged.botActive ? "bg-emerald-500" : ""}
                    >
                      {merged.botActive ? "CONECTADO" : "DESCONECTADO"}
                    </Badge>
                  </div>
                  {merged.botActive ? (
                    <Wifi className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Nota: El bot solo respondera cuando este activado Y tengas flujos configurados en Bot Builder.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TEST TAB */}
        {activeTab === "test" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Probar IA</h3>
              <p className="text-sm text-muted-foreground">
                Envia mensajes de prueba para ver como responde tu bot con la configuracion actual
              </p>
            </div>

            {!merged.botActive && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                El bot esta inactivo. Activalo en &quot;Conexion&quot; para probarlo.
              </div>
            )}

            <div className="rounded-lg border bg-muted/30 h-[400px] flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {testMessages.length === 0 && (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    Envia un mensaje para probar tu bot
                  </div>
                )}
                {testMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                        msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-background border"
                      }`}
                    >
                      {msg.role === "bot" && (
                        <div className="flex items-center gap-1 mb-1 text-xs text-muted-foreground">
                          <Bot className="h-3 w-3" /> Bot
                        </div>
                      )}
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-background border rounded-lg px-4 py-2 text-sm text-muted-foreground">
                      Escribiendo...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="border-t p-3 flex gap-2">
                <Input
                  placeholder="Escribe un mensaje de prueba..."
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendTest();
                    }
                  }}
                  disabled={!merged.botActive || chatMutation.isPending}
                />
                <Button
                  onClick={handleSendTest}
                  disabled={!merged.botActive || chatMutation.isPending || !testInput.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {testMessages.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setTestMessages([])}>
                Limpiar chat
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
