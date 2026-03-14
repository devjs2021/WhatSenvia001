"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse, WhatsAppSession, PaginatedResponse, Contact } from "@/types";
import { toast } from "sonner";
import {
  Smartphone,
  Zap,
  Send,
  Plus,
  X,
  Users,
  FileSpreadsheet,
  FileText,
  List,
  ChevronDown,
  Gauge,
  MessageSquare,
  BarChart2,
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  content: string;
  category: string | null;
}

interface ContactList {
  id: string;
  name: string;
  contactCount: number;
}

type SendMode = "manual" | "lists";
type ContentType = "text" | "poll";
type SpeedPreset = "slow" | "normal" | "fast" | "turbo";

const speedPresets: Record<SpeedPreset, { label: string; seconds: string; msgsPerMin: number; color: string }> = {
  slow:   { label: "Lento",  seconds: "15s", msgsPerMin: 4,  color: "text-blue-500" },
  normal: { label: "Normal", seconds: "8s",  msgsPerMin: 8,  color: "text-green-500" },
  fast:   { label: "Rápido", seconds: "3s",  msgsPerMin: 20, color: "text-orange-500" },
  turbo:  { label: "Turbo",  seconds: "1s",  msgsPerMin: 30, color: "text-red-500" },
};

export default function CampaignsPage() {
  const queryClient = useQueryClient();

  const [sessionId, setSessionId] = useState("");
  const [sendMode, setSendMode] = useState<SendMode>("manual");
  const [speed, setSpeed] = useState<SpeedPreset>("normal");
  const [manualNumbers, setManualNumbers] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedListId, setSelectedListId] = useState("");
  const [listPhones, setListPhones] = useState<string[]>([]);
  const [contentType, setContentType] = useState<ContentType>("text");
  const [message, setMessage] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollMultiSelect, setPollMultiSelect] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);

  const { data: sessionsData } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api.get<ApiResponse<WhatsAppSession[]>>("/whatsapp/sessions"),
  });
  const { data: contactsData } = useQuery({
    queryKey: ["contacts-all"],
    queryFn: () => api.get<PaginatedResponse<Contact>>("/contacts?limit=1000"),
  });
  const { data: tagsData } = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get<ApiResponse<string[]>>("/contacts/tags"),
  });
  const { data: templatesData } = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.get<{ success: boolean; data: Template[] }>("/templates"),
  });
  const { data: contactListsData } = useQuery({
    queryKey: ["contact-lists"],
    queryFn: () => api.get<{ success: boolean; data: ContactList[] }>("/contact-lists"),
  });

  const sessions = sessionsData?.data || [];
  const contacts = contactsData?.data || [];
  const tags = tagsData?.data || [];
  const templates = templatesData?.data || [];
  const contactLists = contactListsData?.data || [];
  const selectedSession = sessions.find((s) => s.id === sessionId);

  const detectedNumbers = useMemo(() => {
    if (!manualNumbers.trim()) return [];
    return manualNumbers
      .split(/[,\n\r;]+/)
      .map((n) => n.replace(/[^0-9]/g, "").trim())
      .filter((n) => n.length >= 10);
  }, [manualNumbers]);

  const filteredContacts = useMemo(() => {
    if (!selectedTag) return contacts;
    return contacts.filter((c) => c.tags?.includes(selectedTag));
  }, [contacts, selectedTag]);

  const totalRecipients = useMemo(() => {
    if (sendMode === "manual") return detectedNumbers.length;
    if (selectedListId) return listPhones.length;
    return filteredContacts.length;
  }, [sendMode, detectedNumbers, selectedListId, listPhones, filteredContacts]);

  async function handleSelectList(listId: string) {
    setSelectedListId(listId);
    setSelectedTag("");
    if (listId) {
      try {
        const res = await api.get<{ success: boolean; data: string[] }>(`/contact-lists/${listId}/phones`);
        setListPhones(res.data);
      } catch {
        setListPhones([]);
      }
    } else {
      setListPhones([]);
    }
  }

  const sendMutation = useMutation({
    mutationFn: async () => {
      let phonesToSend: string[] = [];
      if (sendMode === "manual") phonesToSend = detectedNumbers;
      else if (selectedListId) phonesToSend = listPhones;
      else phonesToSend = filteredContacts.map((c) => c.phone);

      const tempTag = `envio-${Date.now()}`;
      await api.post("/contacts/upsert-bulk", { phones: phonesToSend, tag: tempTag });
      const campaignRes = await api.post<ApiResponse<any>>("/campaigns", {
        name: `Envio ${new Date().toLocaleString("es-CO")}`,
        sessionId,
        message,
        targetTags: [tempTag],
        messagesPerMinute: speedPresets[speed].msgsPerMin,
      });
      await api.post(`/campaigns/${campaignRes.data.id}/start`);
      return campaignRes.data.id;
    },
    onSuccess: () => {
      toast.success(`Enviando a ${totalRecipients} destinatarios`);
      setManualNumbers("");
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["contacts-all"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const sendPollMutation = useMutation({
    mutationFn: async () => {
      let numbers: string[];
      if (sendMode === "manual") numbers = detectedNumbers;
      else if (selectedListId) numbers = listPhones;
      else numbers = filteredContacts.map((c) => c.phone);

      const validOptions = pollOptions.filter((o) => o.trim());
      return api.post("/messages/send-poll-bulk", {
        sessionId,
        phones: numbers,
        question: pollQuestion,
        options: validOptions,
        multiSelect: pollMultiSelect,
      });
    },
    onSuccess: () => {
      toast.success(`Encuesta enviada a ${totalRecipients} destinatarios`);
      setPollQuestion("");
      setPollOptions(["", ""]);
      setManualNumbers("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const [uploading, setUploading] = useState(false);
  async function handleExcelUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/contacts/import-excel", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al importar");
      const phones: string[] = json.data.phones || [];
      if (phones.length > 0) {
        setManualNumbers((prev) => {
          const existing = prev.trim();
          return existing ? `${existing}\n${phones.join("\n")}` : phones.join("\n");
        });
      }
      toast.success(`${json.data.imported} contactos importados`);
      queryClient.invalidateQueries({ queryKey: ["contacts-all"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setShowExcelImport(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  function handleSend() {
    if (!sessionId) return toast.error("Selecciona un dispositivo");
    if (selectedSession?.status !== "connected") return toast.error("El dispositivo no está conectado");
    if (totalRecipients === 0) return toast.error("No hay destinatarios");
    if (contentType === "poll") {
      const validOpts = pollOptions.filter((o) => o.trim());
      if (!pollQuestion.trim() || validOpts.length < 2) return toast.error("Completa la encuesta");
      sendPollMutation.mutate();
    } else {
      if (!message.trim()) return toast.error("Escribe un mensaje");
      sendMutation.mutate();
    }
  }

  const isSending = sendMutation.isPending || sendPollMutation.isPending;
  const isConnected = selectedSession?.status === "connected";

  return (
    <div className="bg-gray-50/50 dark:bg-gray-950/50 p-6 space-y-4">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Envío Masivo</h1>
        <p className="text-xs text-gray-400 mt-0.5">Configura y envía mensajes a múltiples destinatarios</p>
      </div>

      {/* Barra de configuración compacta */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm px-5 py-3 flex items-center gap-0 divide-x divide-gray-100 dark:divide-gray-800">

        {/* Dispositivo */}
        <div className="flex items-center gap-3 pr-5 min-w-0 flex-1">
          <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <Smartphone className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Dispositivo</p>
            <div className="relative">
              <select
                className="w-full appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-800 dark:text-gray-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer pr-7"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.phone ? `· ${s.phone}` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
          {sessionId && (
            <div className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-lg shrink-0 ${
              isConnected ? "bg-green-50 dark:bg-green-900/20 text-green-600" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
            }`}>
              <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
              {isConnected ? "Online" : "Off"}
            </div>
          )}
        </div>

        {/* Modo */}
        <div className="flex items-center gap-3 px-5">
          <div className="h-7 w-7 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
            <Zap className="h-3.5 w-3.5 text-violet-500" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Modo</p>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              {([["manual", "Manual", Users], ["lists", "Listas", List]] as const).map(([mode, label, Icon]) => (
                <button
                  key={mode}
                  onClick={() => { setSendMode(mode); setSelectedListId(""); setListPhones([]); }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    sendMode === mode
                      ? "bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm"
                      : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Velocidad */}
        <div className="flex items-center gap-3 pl-5">
          <div className="h-7 w-7 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
            <Gauge className="h-3.5 w-3.5 text-orange-500" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Velocidad</p>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              {(Object.entries(speedPresets) as [SpeedPreset, typeof speedPresets.slow][]).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => setSpeed(key)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    speed === key
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                      : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                >
                  <span>{preset.label}</span>
                  <span className={`text-[10px] ${speed === key ? "opacity-50" : preset.color}`}>({preset.seconds})</span>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Main two-column section */}
      <div className="grid grid-cols-2 gap-4">

        {/* Destinatarios */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold flex items-center justify-center">1</span>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Destinatarios</p>
            </div>
            {detectedNumbers.length > 0 || totalRecipients > 0 ? (
              <span className="text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2.5 py-1 rounded-full">
                {totalRecipients} números
              </span>
            ) : null}
          </div>

          {sendMode === "manual" ? (
            <div className="space-y-3">
              <textarea
                placeholder={"Pega aquí los números (separados por coma o Enter)\nEj: 573001234567, 573112233445"}
                rows={14}
                value={manualNumbers}
                onChange={(e) => setManualNumbers(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-mono text-gray-800 dark:text-gray-200 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <div className={`h-1.5 w-1.5 rounded-full ${detectedNumbers.length > 0 ? "bg-green-500" : "bg-gray-300"}`} />
                  {detectedNumbers.length} números detectados
                </div>
                <button
                  onClick={() => setShowExcelImport(!showExcelImport)}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Desde Excel
                </button>
              </div>
              {showExcelImport && (
                <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50 space-y-2">
                  <p className="text-xs text-gray-400">Sube un Excel con columna de teléfonos.</p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleExcelUpload(f); }}
                    className="text-xs text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 cursor-pointer"
                  />
                  {uploading && <p className="text-xs text-gray-400 animate-pulse">Importando...</p>}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {contactLists.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1">
                    <List className="h-3 w-3" /> Listas guardadas
                  </label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer pr-9"
                      value={selectedListId}
                      onChange={(e) => handleSelectList(e.target.value)}
                    >
                      <option value="">Seleccionar lista...</option>
                      {contactLists.map((list) => (
                        <option key={list.id} value={list.id}>
                          {list.name} ({list.contactCount} contactos)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}
              {!selectedListId && (
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1">
                    <Users className="h-3 w-3" /> Filtrar por etiqueta
                  </label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer pr-9"
                      value={selectedTag}
                      onChange={(e) => setSelectedTag(e.target.value)}
                    >
                      <option value="">Todos los contactos</option>
                      {tags.map((tag) => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-6 flex flex-col items-center justify-center gap-2 mt-2">
                <div className="h-10 w-10 rounded-full bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center">
                  {selectedListId ? <List className="h-5 w-5 text-gray-400" /> : <Users className="h-5 w-5 text-gray-400" />}
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{totalRecipients}</p>
                <p className="text-xs text-gray-400 text-center">
                  {selectedListId
                    ? `en "${contactLists.find((l) => l.id === selectedListId)?.name}"`
                    : selectedTag ? `con etiqueta "${selectedTag}"` : "contactos en total"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold flex items-center justify-center">2</span>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Contenido</p>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              <button
                onClick={() => setContentType("text")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  contentType === "text"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Texto
              </button>
              <button
                onClick={() => setContentType("poll")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  contentType === "poll"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                <BarChart2 className="h-3.5 w-3.5" />
                Encuesta
              </button>
            </div>
          </div>

          {contentType === "text" ? (
            <div className="space-y-3">
              {templates.length > 0 && (
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <select
                    className="w-full appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-9 py-2.5 text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
                    value=""
                    onChange={(e) => {
                      const t = templates.find((t) => t.id === e.target.value);
                      if (t) setMessage(t.content);
                    }}
                  >
                    <option value="">Usar plantilla...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.category ? `· ${t.category}` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              )}

              {/* Format toolbar */}
              <div className="flex items-center gap-1 border-b border-gray-100 dark:border-gray-800 pb-2">
                {[
                  { label: <strong className="text-xs">B</strong>, insert: "*texto*", title: "Negrita" },
                  { label: <em className="text-xs">I</em>, insert: "_texto_", title: "Cursiva" },
                  { label: <span className="text-xs line-through">S</span>, insert: "~texto~", title: "Tachado" },
                  { label: <span className="text-xs font-mono">&lt;/&gt;</span>, insert: "```codigo```", title: "Código" },
                ].map((btn, i) => (
                  <button
                    key={i}
                    title={btn.title}
                    onClick={() => setMessage((m) => m + btn.insert)}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    {btn.label}
                  </button>
                ))}
                {message && (
                  <div className="ml-auto flex gap-1 flex-wrap">
                    {message.match(/\{\{(\w+)\}\}/g)?.map((v, i) => (
                      <span key={i} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-mono">{v}</span>
                    ))}
                  </div>
                )}
              </div>

              <textarea
                placeholder={"Escribe tu mensaje aquí...\n\nVariables: {{name}}, {{phone}}, {{email}}\nColumnas Excel: {{ciudad}}, {{empresa}}, etc."}
                rows={9}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <input
                placeholder="Pregunta de la encuesta"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <p className="text-xs font-medium text-gray-400">Opciones (mín. 2, máx. 12)</p>
              <div className="space-y-2">
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      placeholder={`Opción ${i + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...pollOptions];
                        newOpts[i] = e.target.value;
                        setPollOptions(newOpts);
                      }}
                      className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                        className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center justify-center transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {pollOptions.length < 12 && (
                <button
                  onClick={() => setPollOptions([...pollOptions, ""])}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar opción
                </button>
              )}
              <label className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pollMultiSelect}
                  onChange={(e) => setPollMultiSelect(e.target.checked)}
                  className="h-4 w-4 rounded-md accent-gray-900 dark:accent-white"
                />
                Permitir selección múltiple
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Send Bar */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span><span className="font-semibold text-gray-900 dark:text-gray-100">{totalRecipients}</span> destinatarios</span>
          <span className="text-gray-200 dark:text-gray-700">·</span>
          <span className={`font-semibold ${speedPresets[speed].color}`}>{speedPresets[speed].label} ({speedPresets[speed].seconds})</span>
          <span className="text-gray-200 dark:text-gray-700">·</span>
          <span>{contentType === "text" ? "Texto" : "Encuesta"}</span>
        </div>
        <button
          onClick={handleSend}
          disabled={isSending}
          className="flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-2 rounded-xl text-sm font-semibold hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {isSending ? (
            <>
              <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 dark:border-gray-900/30 border-t-white dark:border-t-gray-900 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              Enviar a {totalRecipients}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
