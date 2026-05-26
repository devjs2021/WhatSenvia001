"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse, WhatsAppSession } from "@/types";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  Phone,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Bot,
  MoreHorizontal,
  Trash2,
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
}

interface ChatMessage {
  id: string;
  content: string;
  direction: "incoming" | "outgoing";
  status?: string;
  createdAt: string;
}

export default function ChatLivePage() {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: sessionsData } = useQuery({
    queryKey: ["whatsapp-sessions"],
    queryFn: () => api.get<ApiResponse<WhatsAppSession[]>>("/whatsapp/sessions"),
  });

  const sessions = (sessionsData?.data || []).filter((s) => s.status === "connected");

  const { data: contactsData } = useQuery({
    queryKey: ["chat-contacts", selectedSessionId],
    queryFn: () => api.get<ChatContact[]>(`/chat/conversations?sessionId=${selectedSessionId}`),
    enabled: !!selectedSessionId,
    refetchInterval: 10000,
  });

  const { data: messagesData } = useQuery({
    queryKey: ["chat-messages", selectedSessionId, selectedContact],
    queryFn: () => api.get<ChatMessage[]>(`/chat/messages?sessionId=${selectedSessionId}&phone=${selectedContact}`),
    enabled: !!selectedSessionId && !!selectedContact,
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      api.post(`/chat/send`, {
        sessionId: selectedSessionId,
        phone: selectedContact,
        text: messageText.trim(),
      }),
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedSessionId, selectedContact] });
      queryClient.invalidateQueries({ queryKey: ["chat-contacts", selectedSessionId] });
    },
    onError: (err: any) => toast.error(err.message),
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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedSessionId || !selectedContact) return;
    sendMutation.mutate();
  };

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

      {/* Session selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setSelectedSessionId(s.id);
              setSelectedContact(null);
            }}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all border whitespace-nowrap ${
              selectedSessionId === s.id
                ? "bg-emerald-50 border-emerald-500 text-emerald-600"
                : "border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Phone className="h-3.5 w-3.5 inline mr-1.5" />
            {s.name}
            {s.phone && <span className="text-xs ml-1 opacity-60">({s.phone})</span>}
          </button>
        ))}
      </div>

      {!selectedSessionId ? (
        <DashboardCard>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageSquare className="h-12 w-12 text-slate-300 mb-3" />
            <h3 className="font-display text-lg font-bold text-slate-900">Selecciona una sesion</h3>
            <p className="text-sm text-slate-400 mt-1">
              Elige una sesion de WhatsApp para comenzar a chatear
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
                    onClick={() => setSelectedContact(contact.phone)}
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
                      <p className="text-xs text-slate-400 mt-1 truncate">{contact.lastMessage}</p>
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
                      return (
                        <div key={msg.id || i} className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                              isOutgoing
                                ? "bg-emerald-500 text-white rounded-br-md"
                                : "bg-slate-100 text-slate-800 rounded-bl-md"
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
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

                {/* Input */}
                <form onSubmit={handleSend} className="flex gap-2 pt-3 border-t border-slate-100">
                  <input
                    placeholder="Escribe un mensaje..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 flex-1"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim() || sendMutation.isPending}
                    className="h-10 w-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendMutation.isPending ? (
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
