"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse, WhatsAppSession } from "@/types";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  Search,
  Loader2,
  User,
  Paperclip,
  X,
  FileText,
  Download,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardCard, DashboardCardHeader, DashboardCardTitle, DashboardCardDescription } from "@/components/ui/dashboard-card";

interface ChatContact {
  phone: string;
  name?: string;
  pushName?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unread?: number;
  isOnline?: boolean;
  mediaType?: string;
  sessionId?: string;
}

interface ChatMessage {
  id: string;
  content: string;
  direction: "incoming" | "outgoing";
  status?: string;
  createdAt: string;
  mediaUrl?: string;
  mediaType?: string;
}

type FilterMode = "all" | string;

export default function ChatLivePage() {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const { data: sessionsData } = useQuery({
    queryKey: ["whatsapp-sessions"],
    queryFn: () => api.get<ApiResponse<WhatsAppSession[]>>("/whatsapp/sessions"),
  });

  const sessions = (sessionsData?.data || []).filter((s) => s.status === "connected");
  const metaSessions = sessions.filter((s) => s.connectionType === "meta_cloud");
  const baileysSessions = sessions.filter((s) => s.connectionType !== "meta_cloud");

  const querySessionId = filterMode === "all" ? "all" : filterMode;

  const { data: contactsData } = useQuery({
    queryKey: ["chat-contacts", querySessionId],
    queryFn: () => api.get<ChatContact[]>(`/chat/conversations?sessionId=${querySessionId}`),
    enabled: sessions.length > 0,
    refetchInterval: 10000,
  });

  const effectiveSessionId = filterMode === "all" ? activeSessionId : filterMode;

  const { data: messagesData } = useQuery({
    queryKey: ["chat-messages", effectiveSessionId, selectedContact],
    queryFn: () => api.get<ChatMessage[]>(`/chat/messages?sessionId=${effectiveSessionId}&phone=${selectedContact}`),
    enabled: !!effectiveSessionId && !!selectedContact,
    refetchInterval: 5000,
  });

  const contacts = contactsData || [];
  const messages = messagesData || [];

  const filteredContacts = contacts.filter((c) => {
    const phone = c.phone || "";
    const name = c.name || c.pushName || "";
    const search = searchTerm.toLowerCase();
    return phone.includes(search) || name.toLowerCase().includes(search);
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function formatPhone(session: WhatsAppSession): string {
    if (session.phone) {
      return session.phone.replace(/[^0-9+]/g, "").replace(/(\+\d{2})(\d{3})(\d{3})(\d{4})/, "$1 $2 $3$4");
    }
    return "";
  }

  function handleSelectContact(contact: ChatContact) {
    setSelectedContact(contact.phone);
    if (filterMode === "all" && contact.sessionId) {
      setActiveSessionId(contact.sessionId);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("El archivo no puede superar 10MB");
      return;
    }
    setAttachedFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setAttachedPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setAttachedPreview(null);
    }
  }

  function clearAttachment() {
    setAttachedFile(null);
    setAttachedPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if ((!messageText.trim() && !attachedFile) || !effectiveSessionId || !selectedContact) return;

    setSending(true);
    try {
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;

      if (attachedFile) {
        const formData = new FormData();
        formData.append("file", attachedFile);
        const token = localStorage.getItem("token");
        const res = await fetch("/api/chat/upload", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Error al subir archivo");
        }
        const data = await res.json();
        mediaUrl = data.url;
        mediaType = data.mediaType;
      }

      await api.post("/chat/send", {
        sessionId: effectiveSessionId,
        phone: selectedContact,
        text: messageText.trim(),
        mediaUrl,
        mediaType,
      });

      setMessageText("");
      clearAttachment();
      queryClient.invalidateQueries({ queryKey: ["chat-messages", effectiveSessionId, selectedContact] });
      queryClient.invalidateQueries({ queryKey: ["chat-contacts", querySessionId] });
    } catch (err: any) {
      toast.error(err.message || "Error al enviar mensaje");
    } finally {
      setSending(false);
    }
  }

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
  };

  function renderMedia(msg: ChatMessage) {
    if (!msg.mediaUrl) return null;
    const isOutgoing = msg.direction === "outgoing";

    switch (msg.mediaType) {
      case "image":
        return (
          <img
            src={msg.mediaUrl}
            alt="imagen"
            className="max-w-full rounded-lg mb-1 cursor-pointer max-h-64 object-contain"
            onClick={() => window.open(msg.mediaUrl, "_blank")}
          />
        );
      case "video":
        return (
          <video controls className="max-w-full rounded-lg mb-1 max-h-64">
            <source src={msg.mediaUrl} />
          </video>
        );
      case "audio":
        return (
          <audio controls className="w-full mb-1">
            <source src={msg.mediaUrl} />
          </audio>
        );
      case "document":
        return (
          <a
            href={msg.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 mb-1 px-3 py-2 rounded-lg transition-colors ${
              isOutgoing
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-700"
            }`}
          >
            <Download className="h-4 w-4 shrink-0" />
            <span className="text-sm underline truncate">
              {msg.content && !msg.content.startsWith("[") ? msg.content : "Descargar documento"}
            </span>
          </a>
        );
      default:
        return null;
    }
  }

  function getContactMediaPrefix(mediaType?: string) {
    if (!mediaType) return "";
    const icons: Record<string, string> = {
      image: "📷 ",
      video: "🎥 ",
      audio: "🎵 ",
      document: "📄 ",
    };
    return icons[mediaType] || "";
  }

  const showAllButton = sessions.length > 0;

  return (
    <div className="space-y-4 md:space-y-6">
      <DashboardHeader
        title={
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chat en Vivo
          </div>
        }
        description="Gestiona conversaciones en tiempo real con tus contactos"
      />

      {/* Filter buttons */}
      {sessions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {/* All Chat */}
          {showAllButton && (
            <button
              onClick={() => { setFilterMode("all"); setSelectedContact(null); setActiveSessionId(""); }}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all border whitespace-nowrap ${
                filterMode === "all"
                  ? "bg-slate-900 border-slate-900 text-white"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 inline mr-1.5" />
              All Chat
            </button>
          )}

          {/* Meta sessions */}
          {metaSessions.map((s) => (
            <button
              key={s.id}
              onClick={() => { setFilterMode(s.id); setSelectedContact(null); }}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all border whitespace-nowrap ${
                filterMode === s.id
                  ? "bg-blue-50 border-blue-500 text-blue-600"
                  : "border-slate-200 text-slate-500 hover:bg-blue-50/50"
              }`}
            >
              <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                filterMode === s.id ? "bg-blue-500" : "bg-blue-400"
              }`} />
              Meta {formatPhone(s)}
            </button>
          ))}

          {/* Baileys/WhatsApp sessions */}
          {baileysSessions.map((s) => (
            <button
              key={s.id}
              onClick={() => { setFilterMode(s.id); setSelectedContact(null); }}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all border whitespace-nowrap ${
                filterMode === s.id
                  ? "bg-emerald-50 border-emerald-500 text-emerald-600"
                  : "border-slate-200 text-slate-500 hover:bg-emerald-50/50"
              }`}
            >
              <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                filterMode === s.id ? "bg-emerald-500" : "bg-emerald-400"
              }`} />
              WhatsApp {formatPhone(s)}
            </button>
          ))}
        </div>
      )}

      {sessions.length === 0 ? (
        <DashboardCard>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageSquare className="h-12 w-12 text-slate-300 mb-3" />
            <h3 className="font-display text-lg font-bold text-slate-900">Sin sesiones conectadas</h3>
            <p className="text-sm text-slate-400 mt-1">
              Conecta una sesion de WhatsApp para comenzar a chatear
            </p>
          </div>
        </DashboardCard>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
          {/* Contacts sidebar */}
          <div className="w-full lg:w-72 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                placeholder="Buscar contacto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 w-full"
              />
            </div>

            <div className="max-h-[500px] overflow-y-auto space-y-1">
              {filteredContacts.length === 0 ? (
                <p className="text-sm text-slate-400 p-3 text-center">No se encontraron contactos</p>
              ) : (
                filteredContacts.map((contact) => (
                  <button
                    key={contact.phone}
                    onClick={() => handleSelectContact(contact)}
                    className={`w-full text-left rounded-2xl border p-3 transition-colors ${
                      selectedContact === contact.phone
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {contact.name || contact.pushName || contact.phone}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{contact.phone}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {contact.lastMessageAt && (
                          <span className="text-xs text-slate-400">{formatTime(contact.lastMessageAt)}</span>
                        )}
                        {(contact.unread || 0) > 0 && (
                          <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-emerald-500 text-white text-xs font-bold px-1">
                            {contact.unread}
                          </span>
                        )}
                      </div>
                    </div>
                    {contact.lastMessage && (
                      <p className="text-xs text-slate-400 mt-1 truncate">
                        {getContactMediaPrefix(contact.mediaType)}{contact.lastMessage}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 min-w-0">
            {!selectedContact ? (
              <DashboardCard>
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <MessageSquare className="h-12 w-12 text-slate-300 mb-3" />
                  <h3 className="font-display text-lg font-bold text-slate-900">Selecciona un contacto</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Elige un contacto para ver la conversacion
                  </p>
                </div>
              </DashboardCard>
            ) : (
              <DashboardCard>
                {/* Chat header */}
                <DashboardCardHeader>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                    <div>
                      <DashboardCardTitle>
                        {(() => {
                          const c = contacts.find((ct) => ct.phone === selectedContact);
                          return c?.name || c?.pushName || selectedContact;
                        })()}
                      </DashboardCardTitle>
                      <DashboardCardDescription>{selectedContact}</DashboardCardDescription>
                    </div>
                  </div>
                </DashboardCardHeader>

                {/* Messages */}
                <div className="max-h-[400px] overflow-y-auto space-y-3 px-1 py-2">
                  {messages.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">
                      No hay mensajes en esta conversacion. Envia el primero!
                    </p>
                  ) : (
                    messages.map((msg, i) => {
                      const isOutgoing = msg.direction === "outgoing";
                      const showTextContent = msg.content && !msg.content.match(/^\[(image|video|audio|document)\]$/i);
                      return (
                        <div key={msg.id || i} className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                              isOutgoing
                                ? "bg-emerald-500 text-white rounded-br-md"
                                : "bg-slate-100 text-slate-800 rounded-bl-md"
                            }`}
                          >
                            {renderMedia(msg)}
                            {showTextContent && <p className="text-sm">{msg.content}</p>}
                            <div className={`flex items-center gap-1 mt-1 ${isOutgoing ? "justify-end" : "justify-start"}`}>
                              <span className={`text-xs ${isOutgoing ? "text-emerald-200" : "text-slate-400"}`}>
                                {formatTime(msg.createdAt)}
                              </span>
                              {isOutgoing && msg.status && (
                                <span className="text-xs text-emerald-200">
                                  {msg.status === "sent" ? "✓" : msg.status === "delivered" ? "✓✓" : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Attachment preview */}
                {attachedFile && (
                  <div className="flex items-center gap-2 mx-1 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                    {attachedPreview ? (
                      <img src={attachedPreview} className="h-12 w-12 rounded object-cover" alt="preview" />
                    ) : (
                      <FileText className="h-5 w-5 text-slate-400 shrink-0" />
                    )}
                    <span className="text-sm text-slate-600 truncate flex-1">{attachedFile.name}</span>
                    <span className="text-xs text-slate-400 shrink-0">
                      {(attachedFile.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <button type="button" onClick={clearAttachment} className="shrink-0 hover:bg-slate-200 rounded p-0.5">
                      <X className="h-4 w-4 text-slate-400" />
                    </button>
                  </div>
                )}

                {/* Input */}
                <form onSubmit={handleSend} className="flex gap-2 pt-3 border-t border-slate-100">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-10 w-10 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-colors shrink-0"
                  >
                    <Paperclip className="h-4 w-4 text-slate-400" />
                  </button>
                  <input
                    placeholder="Escribe un mensaje..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 flex-1"
                  />
                  <button
                    type="submit"
                    disabled={(!messageText.trim() && !attachedFile) || sending}
                    className="h-10 w-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </form>
              </DashboardCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
