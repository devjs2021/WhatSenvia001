"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse, WhatsAppSession, PaginatedResponse, Contact } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const speedPresets: Record<SpeedPreset, { label: string; seconds: string; msgsPerMin: number }> = {
  slow: { label: "Lento", seconds: "15s", msgsPerMin: 4 },
  normal: { label: "Normal", seconds: "8s", msgsPerMin: 8 },
  fast: { label: "Rapido", seconds: "3s", msgsPerMin: 20 },
  turbo: { label: "Turbo", seconds: "1s", msgsPerMin: 30 },
};

export default function CampaignsPage() {
  const queryClient = useQueryClient();

  // Device
  const [sessionId, setSessionId] = useState("");

  // Mode
  const [sendMode, setSendMode] = useState<SendMode>("manual");

  // Speed
  const [speed, setSpeed] = useState<SpeedPreset>("normal");

  // Recipients - Manual
  const [manualNumbers, setManualNumbers] = useState("");

  // Recipients - Lists (tags or contact lists)
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedListId, setSelectedListId] = useState("");
  const [listPhones, setListPhones] = useState<string[]>([]);

  // Content
  const [contentType, setContentType] = useState<ContentType>("text");
  const [message, setMessage] = useState("");

  // Poll
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollMultiSelect, setPollMultiSelect] = useState(false);

  // Excel import
  const [showExcelImport, setShowExcelImport] = useState(false);

  // Queries
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

  // Parse manual numbers
  const detectedNumbers = useMemo(() => {
    if (!manualNumbers.trim()) return [];
    return manualNumbers
      .split(/[,\n\r;]+/)
      .map((n) => n.replace(/[^0-9]/g, "").trim())
      .filter((n) => n.length >= 10);
  }, [manualNumbers]);

  // Contacts filtered by tag
  const filteredContacts = useMemo(() => {
    if (!selectedTag) return contacts;
    return contacts.filter((c) => c.tags?.includes(selectedTag));
  }, [contacts, selectedTag]);

  // Total recipients depends on mode
  const totalRecipients = useMemo(() => {
    if (sendMode === "manual") return detectedNumbers.length;
    if (selectedListId) return listPhones.length;
    return filteredContacts.length;
  }, [sendMode, detectedNumbers, selectedListId, listPhones, filteredContacts]);

  // When a contact list is selected, fetch its phones
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

  // Send campaign mutation (text)
  const sendMutation = useMutation({
    mutationFn: async () => {
      // Determine which numbers to send to
      let phonesToSend: string[] = [];

      if (sendMode === "manual") {
        phonesToSend = detectedNumbers;
      } else if (selectedListId) {
        phonesToSend = listPhones;
      } else {
        phonesToSend = filteredContacts.map((c) => c.phone);
      }

      const tempTag = `envio-${Date.now()}`;

      // Upsert contacts with temp tag
      await api.post("/contacts/upsert-bulk", {
        phones: phonesToSend,
        tag: tempTag,
      });

      // Create campaign
      const campaignRes = await api.post<ApiResponse<any>>("/campaigns", {
        name: `Envio ${new Date().toLocaleString("es-CO")}`,
        sessionId,
        message,
        targetTags: [tempTag],
        messagesPerMinute: speedPresets[speed].msgsPerMin,
      });

      // Start it
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

  // Send polls
  const sendPollMutation = useMutation({
    mutationFn: async () => {
      let numbers: string[];
      if (sendMode === "manual") {
        numbers = detectedNumbers;
      } else if (selectedListId) {
        numbers = listPhones;
      } else {
        numbers = filteredContacts.map((c) => c.phone);
      }

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

  // Excel upload
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

      toast.success(`${json.data.imported} contactos importados y ${phones.length} numeros cargados`);
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
    if (selectedSession?.status !== "connected") return toast.error("El dispositivo no esta conectado");
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Envio Masivo</h1>
        <p className="text-muted-foreground">Configura y envia mensajes a multiples destinatarios</p>
      </div>

      {/* Top Row: Device + Mode + Speed */}
      <div className="grid grid-cols-3 gap-4">
        {/* DISPOSITIVO */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wide flex items-center gap-2 text-muted-foreground">
              <Smartphone className="h-4 w-4" />
              Dispositivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
            >
              <option value="">Seleccionar dispositivo...</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.phone ? `(${s.phone})` : ""}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  selectedSession?.status === "connected" ? "bg-green-500" : "bg-gray-300"
                }`}
              />
              <span className="text-xs text-muted-foreground">
                STATUS: {selectedSession?.status === "connected" ? "Conectado" : "No conectado"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* MODO DE ENVÍO */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wide flex items-center gap-2 text-muted-foreground">
              <Zap className="h-4 w-4" />
              Modo de envio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setSendMode("manual"); setSelectedListId(""); setListPhones([]); }}
                className={`rounded-lg border-2 py-4 text-sm font-medium transition-colors ${
                  sendMode === "manual"
                    ? "border-primary text-primary bg-primary/5"
                    : "border-muted text-muted-foreground hover:border-muted-foreground/30"
                }`}
              >
                Manual
              </button>
              <button
                onClick={() => setSendMode("lists")}
                className={`rounded-lg border-2 py-4 text-sm font-medium transition-colors ${
                  sendMode === "lists"
                    ? "border-primary text-primary bg-primary/5"
                    : "border-muted text-muted-foreground hover:border-muted-foreground/30"
                }`}
              >
                Listas
              </button>
            </div>
          </CardContent>
        </Card>

        {/* VELOCIDAD */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wide flex items-center gap-2 text-muted-foreground">
              <Zap className="h-4 w-4" />
              Velocidad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(speedPresets) as [SpeedPreset, typeof speedPresets.slow][]).map(
                ([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => setSpeed(key)}
                    className={`rounded-lg border-2 py-2 text-center transition-colors ${
                      speed === key
                        ? "border-primary text-primary bg-primary/5"
                        : "border-muted text-muted-foreground hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className="text-sm font-medium">{preset.label}</div>
                    <div className="text-xs opacity-70">({preset.seconds})</div>
                  </button>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Recipients + Content */}
      <div className="grid grid-cols-2 gap-4">
        {/* DESTINATARIOS */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Badge variant="outline" className="rounded-full h-6 w-6 p-0 flex items-center justify-center text-xs">1</Badge>
              Destinatarios
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sendMode === "manual" ? (
              <>
                <Textarea
                  placeholder={"Pega aqui los numeros (separados por coma o Enter)\nEj: 573001234567, 573112233445"}
                  rows={10}
                  value={manualNumbers}
                  onChange={(e) => setManualNumbers(e.target.value)}
                  className="font-mono text-sm resize-none"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    {detectedNumbers.length} numeros detectados
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowExcelImport(!showExcelImport)}
                  >
                    <FileSpreadsheet className="mr-1 h-4 w-4" />
                    Desde Excel
                  </Button>
                </div>
                {showExcelImport && (
                  <div className="rounded-lg border p-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Sube un Excel con una columna de telefonos. Los numeros se cargan automaticamente.
                    </p>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleExcelUpload(file);
                      }}
                      className="text-sm"
                    />
                    {uploading && <p className="text-xs text-muted-foreground">Importando...</p>}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                {/* Contact Lists */}
                {contactLists.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                      <List className="h-3 w-3" /> Listas guardadas
                    </label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                  </div>
                )}

                {/* Tags fallback (when no list selected) */}
                {!selectedListId && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Users className="h-3 w-3" /> Filtrar por tag
                    </label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={selectedTag}
                      onChange={(e) => setSelectedTag(e.target.value)}
                    >
                      <option value="">Todos los contactos</option>
                      {tags.map((tag) => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="rounded-lg bg-muted/50 p-4 text-center space-y-1">
                  {selectedListId ? (
                    <List className="h-8 w-8 mx-auto text-muted-foreground" />
                  ) : (
                    <Users className="h-8 w-8 mx-auto text-muted-foreground" />
                  )}
                  <p className="text-2xl font-bold">{totalRecipients}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedListId
                      ? `contactos en "${contactLists.find((l) => l.id === selectedListId)?.name}"`
                      : selectedTag
                        ? `contactos con tag "${selectedTag}"`
                        : "contactos en total"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CONTENIDO */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Badge variant="outline" className="rounded-full h-6 w-6 p-0 flex items-center justify-center text-xs">2</Badge>
                Contenido
              </CardTitle>
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  onClick={() => setContentType("text")}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                    contentType === "text"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Texto
                </button>
                <button
                  onClick={() => setContentType("poll")}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                    contentType === "poll"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Encuesta
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {contentType === "text" ? (
              <>
                {/* Template selector */}
                {templates.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Usar plantilla
                    </label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                      value=""
                      onChange={(e) => {
                        const t = templates.find((t) => t.id === e.target.value);
                        if (t) setMessage(t.content);
                      }}
                    >
                      <option value="">Seleccionar plantilla...</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.category ? `(${t.category})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-2 items-center border-b pb-2">
                  <button className="p-1.5 rounded hover:bg-muted" title="Negrita" onClick={() => setMessage((m) => m + "*texto*")}>
                    <strong className="text-sm">B</strong>
                  </button>
                  <button className="p-1.5 rounded hover:bg-muted" title="Cursiva" onClick={() => setMessage((m) => m + "_texto_")}>
                    <em className="text-sm">I</em>
                  </button>
                  <button className="p-1.5 rounded hover:bg-muted" title="Tachado" onClick={() => setMessage((m) => m + "~texto~")}>
                    <span className="text-sm line-through">S</span>
                  </button>
                  <button className="p-1.5 rounded hover:bg-muted" title="Monospace" onClick={() => setMessage((m) => m + "```codigo```")}>
                    <span className="text-sm font-mono">&lt;&gt;</span>
                  </button>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {!message && "Selecciona una plantilla o escribe"}
                  </span>
                </div>
                <Textarea
                  placeholder={"Escribe tu mensaje aqui...\n\nVariables: {{name}}, {{phone}}, {{email}}\nColumnas Excel: {{ciudad}}, {{empresa}}, etc."}
                  rows={8}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="resize-none"
                />
                {message && (
                  <div className="flex gap-2 flex-wrap">
                    {message.match(/\{\{(\w+)\}\}/g)?.map((v, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{v}</Badge>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <Input
                  placeholder="Pregunta de la encuesta"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Opciones (min 2, max 12)</label>
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder={`Opcion ${i + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...pollOptions];
                          newOpts[i] = e.target.value;
                          setPollOptions(newOpts);
                        }}
                      />
                      {pollOptions.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 shrink-0"
                          onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 12 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPollOptions([...pollOptions, ""])}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Agregar opcion
                    </Button>
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={pollMultiSelect}
                    onChange={(e) => setPollMultiSelect(e.target.checked)}
                    className="rounded"
                  />
                  Permitir seleccion multiple
                </label>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Send Button Bar */}
      <div className="flex items-center justify-between rounded-lg border p-4 bg-card">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{totalRecipients}</span> destinatarios
          {" · "}
          <span className="font-medium text-foreground">{speedPresets[speed].label}</span> ({speedPresets[speed].seconds})
          {" · "}
          {contentType === "text" ? "Mensaje de texto" : "Encuesta"}
        </div>
        <Button
          size="lg"
          onClick={handleSend}
          disabled={isSending}
        >
          {isSending ? (
            "Enviando..."
          ) : (
            <>
              <Send className="mr-2 h-5 w-5" />
              Enviar a {totalRecipients} destinatarios
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
