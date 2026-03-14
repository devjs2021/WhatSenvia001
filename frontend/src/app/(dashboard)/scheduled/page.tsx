"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse, WhatsAppSession } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Clock,
  Plus,
  Trash2,
  XCircle,
  CalendarClock,
  Send,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface ContactList {
  id: string;
  name: string;
  contactCount: number;
}

interface ScheduledCampaign {
  id: string;
  sessionId: string;
  name: string;
  message: string;
  contactListId: string | null;
  contacts: Array<Record<string, string>>;
  scheduledAt: string;
  status: "pending" | "running" | "completed" | "cancelled" | "failed";
  totalContacts: number;
  sentCount: number;
  failedCount: number;
  options: Record<string, any> | null;
  completedAt: string | null;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  running: { label: "Ejecutando", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Loader2 },
  completed: { label: "Completada", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  cancelled: { label: "Cancelada", color: "bg-gray-100 text-gray-800 border-gray-200", icon: XCircle },
  failed: { label: "Fallida", color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle },
};

function Countdown({ targetDate }: { targetDate: string }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const target = new Date(targetDate);
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return <span className="text-sm text-muted-foreground">Ejecutando pronto...</span>;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return (
    <span className="text-sm font-mono text-muted-foreground">
      {parts.join(" ")}
    </span>
  );
}

export default function ScheduledPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [contactSource, setContactSource] = useState<"list" | "manual">("manual");
  const [selectedListId, setSelectedListId] = useState("");
  const [listPhones, setListPhones] = useState<string[]>([]);
  const [manualNumbers, setManualNumbers] = useState("");
  const [message, setMessage] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  // Queries
  const { data: sessionsData } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api.get<ApiResponse<WhatsAppSession[]>>("/whatsapp/sessions"),
  });

  const { data: contactListsData } = useQuery({
    queryKey: ["contact-lists"],
    queryFn: () => api.get<{ success: boolean; data: ContactList[] }>("/contact-lists"),
  });

  const { data: scheduledData, isLoading } = useQuery({
    queryKey: ["scheduled-campaigns"],
    queryFn: () => api.get<{ success: boolean; data: ScheduledCampaign[] }>("/scheduled"),
    refetchInterval: 30000,
  });

  const sessions = sessionsData?.data || [];
  const contactLists = contactListsData?.data || [];
  const campaigns = scheduledData?.data || [];

  // Parse manual numbers into contacts array
  const detectedNumbers = useMemo(() => {
    if (!manualNumbers.trim()) return [];
    return manualNumbers
      .split(/[,\n\r;]+/)
      .map((n) => n.replace(/[^0-9]/g, "").trim())
      .filter((n) => n.length >= 10);
  }, [manualNumbers]);

  const totalContacts = contactSource === "list" ? listPhones.length : detectedNumbers.length;

  async function handleSelectList(listId: string) {
    setSelectedListId(listId);
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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      let contacts: Array<Record<string, string>>;

      if (contactSource === "list") {
        contacts = listPhones.map((phone) => ({ phone }));
      } else {
        contacts = detectedNumbers.map((phone) => ({ phone }));
      }

      return api.post<{ success: boolean; data: ScheduledCampaign }>("/scheduled", {
        sessionId,
        name,
        message,
        contacts,
        scheduledAt,
        contactListId: contactSource === "list" ? selectedListId : undefined,
      });
    },
    onSuccess: () => {
      toast.success("Campaña programada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["scheduled-campaigns"] });
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/scheduled/${id}/cancel`),
    onSuccess: () => {
      toast.success("Campaña cancelada");
      queryClient.invalidateQueries({ queryKey: ["scheduled-campaigns"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/scheduled/${id}`),
    onSuccess: () => {
      toast.success("Campaña eliminada");
      queryClient.invalidateQueries({ queryKey: ["scheduled-campaigns"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  function resetForm() {
    setShowForm(false);
    setName("");
    setSessionId("");
    setContactSource("manual");
    setSelectedListId("");
    setListPhones([]);
    setManualNumbers("");
    setMessage("");
    setScheduledAt("");
  }

  function handleSubmit() {
    if (!name.trim()) return toast.error("Ingresa un nombre");
    if (!sessionId) return toast.error("Selecciona un dispositivo");
    if (!message.trim()) return toast.error("Escribe un mensaje");
    if (totalContacts === 0) return toast.error("Agrega al menos un contacto");
    if (!scheduledAt) return toast.error("Selecciona fecha y hora");

    const scheduled = new Date(scheduledAt);
    if (scheduled <= new Date()) return toast.error("La fecha debe ser en el futuro");

    createMutation.mutate();
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-semibold">Envios Programados</h1>
          <p className="text-muted-foreground">
            Programa campañas para enviar en una fecha y hora futura
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? (
            <>
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Programar Nuevo Envio
            </>
          )}
        </Button>
      </div>

      {/* Creation Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Nuevo Envio Programado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre de la campaña</label>
                <Input
                  placeholder="Ej: Promo Viernes"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Session */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Dispositivo</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                >
                  <option value="">Seleccionar dispositivo...</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.phone ? `(${s.phone})` : ""}{" "}
                      {s.status === "connected" ? "- Conectado" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contact source */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Contactos</label>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => { setContactSource("manual"); setSelectedListId(""); setListPhones([]); }}
                  className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                    contactSource === "manual"
                      ? "border-primary text-primary bg-primary/5"
                      : "border-muted text-muted-foreground hover:border-muted-foreground/30"
                  }`}
                >
                  Numeros manuales
                </button>
                <button
                  onClick={() => setContactSource("list")}
                  className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                    contactSource === "list"
                      ? "border-primary text-primary bg-primary/5"
                      : "border-muted text-muted-foreground hover:border-muted-foreground/30"
                  }`}
                >
                  Lista de contactos
                </button>
              </div>

              {contactSource === "manual" ? (
                <>
                  <Textarea
                    placeholder={"Pega numeros separados por coma o Enter\nEj: 573001234567, 573112233445"}
                    rows={4}
                    value={manualNumbers}
                    onChange={(e) => setManualNumbers(e.target.value)}
                    className="font-mono text-sm resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {detectedNumbers.length} numeros detectados
                  </p>
                </>
              ) : (
                <div className="space-y-2">
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
                  {selectedListId && (
                    <p className="text-xs text-muted-foreground">
                      {listPhones.length} contactos cargados
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Message */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Mensaje</label>
              <Textarea
                placeholder={"Escribe tu mensaje...\nVariables: {{name}}, {{phone}}"}
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="resize-none"
              />
              {message && message.match(/\{\{(\w+)\}\}/g) && (
                <div className="flex gap-2 flex-wrap">
                  {message.match(/\{\{(\w+)\}\}/g)?.map((v, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{v}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Scheduled Date/Time */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha y hora de envio</label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>

            {/* Summary + Submit */}
            <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{totalContacts}</span> contactos
                {scheduledAt && (
                  <>
                    {" · "}
                    <span className="font-medium text-foreground">
                      {new Date(scheduledAt).toLocaleString("es-CO")}
                    </span>
                  </>
                )}
              </div>
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  "Programando..."
                ) : (
                  <>
                    <CalendarClock className="mr-2 h-4 w-4" />
                    Programar Envio
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaigns List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando campañas...</div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarClock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No hay envios programados</h3>
            <p className="text-muted-foreground text-sm">
              Programa tu primer envio para que se ejecute automaticamente
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const status = statusConfig[campaign.status] || statusConfig.pending;
            const StatusIcon = status.icon;

            return (
              <Card key={campaign.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{campaign.name}</h3>
                          <Badge
                            variant="outline"
                            className={`shrink-0 ${status.color}`}
                          >
                            <StatusIcon className={`mr-1 h-3 w-3 ${campaign.status === "running" ? "animate-spin" : ""}`} />
                            {status.label}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {campaign.totalContacts} contactos
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {new Date(campaign.scheduledAt).toLocaleString("es-CO")}
                          </span>
                          {campaign.status === "completed" && (
                            <span className="flex items-center gap-1">
                              <Send className="h-3.5 w-3.5" />
                              {campaign.sentCount} enviados
                              {campaign.failedCount > 0 && (
                                <span className="text-red-500">
                                  , {campaign.failedCount} fallidos
                                </span>
                              )}
                            </span>
                          )}
                        </div>

                        {campaign.status === "pending" && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <Countdown targetDate={campaign.scheduledAt} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      {campaign.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelMutation.mutate(campaign.id)}
                          disabled={cancelMutation.isPending}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Cancelar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Eliminar esta campaña programada?")) {
                            deleteMutation.mutate(campaign.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
