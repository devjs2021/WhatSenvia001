"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse, WhatsAppSession } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Search,
  SendHorizontal,
  Bot,
  User,
  MessageSquare,
  PanelRightOpen,
  PanelRightClose,
  Phone,
  StickyNote,
  ArrowLeft,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────

interface Conversation {
  phone: string;
  pushName?: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
}

interface ChatMessage {
  id: string;
  phone: string;
  content: string;
  fromMe: boolean;
  source?: "bot" | "human";
  timestamp: string;
}

type CrmStatus = "Nuevo" | "Lead" | "Interesado" | "Cliente" | "VIP" | "Inactivo";

const CRM_STATUSES: { label: CrmStatus; color: string }[] = [
  { label: "Nuevo", color: "bg-blue-500" },
  { label: "Lead", color: "bg-yellow-500" },
  { label: "Interesado", color: "bg-orange-500" },
  { label: "Cliente", color: "bg-green-500" },
  { label: "VIP", color: "bg-purple-500" },
  { label: "Inactivo", color: "bg-gray-400" },
];

// ── Component ──────────────────────────────────────────────────────────

export default function ChatLivePage() {
  const queryClient = useQueryClient();

  // State
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [botPaused, setBotPaused] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [crmStatus, setCrmStatus] = useState<CrmStatus>("Nuevo");
  const [quickNote, setQuickNote] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch sessions to get the first connected one
  const { data: sessionsData } = useQuery({
    queryKey: ["whatsapp-sessions"],
    queryFn: () => api.get<ApiResponse<WhatsAppSession[]>>("/whatsapp/sessions"),
  });

  const sessions = sessionsData?.data || [];
  const connectedSession = sessions.find((s) => s.status === "connected");
  const sessionId = connectedSession?.id;

  // Fetch conversations
  const { data: conversationsData } = useQuery({
    queryKey: ["chat-conversations", sessionId],
    queryFn: () =>
      api.get<ApiResponse<Conversation[]>>(`/chat/conversations?sessionId=${sessionId}`),
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (conversationsData?.data) {
      setConversations(conversationsData.data);
    }
  }, [conversationsData]);

  // Fetch messages for selected conversation
  const { data: messagesData } = useQuery({
    queryKey: ["chat-messages", sessionId, selectedPhone],
    queryFn: () =>
      api.get<ApiResponse<ChatMessage[]>>(
        `/chat/messages?sessionId=${sessionId}&phone=${selectedPhone}&limit=50`
      ),
    enabled: !!sessionId && !!selectedPhone,
  });

  useEffect(() => {
    if (messagesData?.data) {
      setLocalMessages(messagesData.data);
    }
  }, [messagesData]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  // WebSocket connection
  useEffect(() => {
    if (!sessionId) return;

    const ws = new WebSocket(`ws://localhost:3001/api/chat/ws?sessionId=${sessionId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const { event: eventName, data } = JSON.parse(event.data);

        if (eventName === "new_message") {
          const msg = data as ChatMessage;

          // Update conversations list
          setConversations((prev) => {
            const existing = prev.find((c) => c.phone === msg.phone);
            if (existing) {
              return prev
                .map((c) =>
                  c.phone === msg.phone
                    ? {
                        ...c,
                        lastMessage: msg.content,
                        lastMessageAt: msg.timestamp,
                        unread: msg.phone !== selectedPhone && !msg.fromMe,
                      }
                    : c
                )
                .sort(
                  (a, b) =>
                    new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
                );
            }
            return [
              {
                phone: msg.phone,
                pushName: undefined,
                lastMessage: msg.content,
                lastMessageAt: msg.timestamp,
                unread: !msg.fromMe,
              },
              ...prev,
            ];
          });

          // Add to messages if it belongs to the current conversation
          if (msg.phone === selectedPhone) {
            setLocalMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        }
      } catch {
        // Ignore malformed messages
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [sessionId, selectedPhone]);

  // Send message handler
  const handleSend = useCallback(async () => {
    if (!messageText.trim() || !sessionId || !selectedPhone || sending) return;

    setSending(true);
    try {
      await api.post("/chat/send", {
        sessionId,
        phone: selectedPhone,
        text: messageText.trim(),
      });

      // Optimistically add the message
      const optimisticMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        phone: selectedPhone,
        content: messageText.trim(),
        fromMe: true,
        source: "human",
        timestamp: new Date().toISOString(),
      };
      setLocalMessages((prev) => [...prev, optimisticMsg]);
      setMessageText("");
    } catch {
      // Error handled silently
    } finally {
      setSending(false);
    }
  }, [messageText, sessionId, selectedPhone, sending]);

  // Select conversation
  const handleSelectConversation = (phone: string) => {
    setSelectedPhone(phone);
    // Mark as read
    setConversations((prev) =>
      prev.map((c) => (c.phone === phone ? { ...c, unread: false } : c))
    );
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.phone.toLowerCase().includes(q) ||
      c.pushName?.toLowerCase().includes(q) ||
      c.lastMessage.toLowerCase().includes(q)
    );
  });

  const selectedConversation = conversations.find((c) => c.phone === selectedPhone);

  // Group messages by date
  const groupedMessages = localMessages.reduce<{ date: string; messages: ChatMessage[] }[]>(
    (groups, msg) => {
      const date = new Date(msg.timestamp).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === date) {
        lastGroup.messages.push(msg);
      } else {
        groups.push({ date, messages: [msg] });
      }
      return groups;
    },
    []
  );

  // ── No session warning ─────────────────────────────────────────────

  if (!sessionId && sessionsData) {
    return (
      <div className="flex h-[calc(100vh-theme(spacing.28))] items-center justify-center">
        <Card className="p-8 text-center">
          <Phone className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Sin sesion conectada</h2>
          <p className="mt-2 text-muted-foreground">
            Conecta una sesion de WhatsApp para usar el chat en vivo.
          </p>
        </Card>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-theme(spacing.28))] gap-0 overflow-hidden rounded-lg border bg-card">
      {/* ── Left Panel: Conversations ─────────────────────────────── */}
      <div className={`flex w-full md:w-80 flex-shrink-0 flex-col border-r ${selectedPhone ? "hidden md:flex" : "flex"}`}>
        {/* Search */}
        <div className="border-b p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar conversacion..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mb-2" />
              <p className="text-sm">No hay conversaciones</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.phone}
                onClick={() => handleSelectConversation(conv.phone)}
                className={`flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-accent/50 ${
                  selectedPhone === conv.phone ? "bg-accent" : ""
                }`}
              >
                {/* Avatar */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <User className="h-5 w-5" />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium">
                      {conv.pushName || conv.phone}
                    </span>
                    <span className="ml-2 flex-shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.lastMessageAt), {
                        addSuffix: false,
                        locale: es,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <p className="truncate text-xs text-muted-foreground">{conv.lastMessage}</p>
                    {conv.unread && (
                      <span className="ml-auto h-2.5 w-2.5 flex-shrink-0 rounded-full bg-green-500" />
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Center Panel: Chat ─────────────────────────────────────── */}
      <div className={`flex flex-1 flex-col ${!selectedPhone ? "hidden md:flex" : "flex"}`}>
        {selectedPhone ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSelectConversation("")}
                  className="md:hidden p-1 rounded hover:bg-accent"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {selectedConversation?.pushName || selectedPhone}
                  </p>
                  {selectedConversation?.pushName && (
                    <p className="text-xs text-muted-foreground">{selectedPhone}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={botPaused ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => setBotPaused(!botPaused)}
                  className="gap-1.5"
                >
                  <Bot className="h-4 w-4" />
                  {botPaused ? "Bot pausado" : "Bot activo"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowInfo(!showInfo)}
                >
                  {showInfo ? (
                    <PanelRightClose className="h-4 w-4" />
                  ) : (
                    <PanelRightOpen className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Messages area */}
            <div
              className="flex-1 overflow-y-auto bg-muted/20 px-4 py-4"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
              }}
            >
              {groupedMessages.map((group) => (
                <div key={group.date}>
                  {/* Date separator */}
                  <div className="my-4 flex items-center justify-center">
                    <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground shadow-sm">
                      {group.date}
                    </span>
                  </div>

                  {/* Messages */}
                  {group.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`mb-2 flex ${msg.fromMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`relative max-w-[85%] md:max-w-[70%] rounded-2xl px-3 py-2 shadow-sm ${
                          msg.fromMe
                            ? msg.source === "bot"
                              ? "rounded-br-md bg-[#25D366] text-white"
                              : "rounded-br-md bg-blue-500 text-white"
                            : "rounded-bl-md bg-card border"
                        }`}
                      >
                        {msg.fromMe && (
                          <div className="mb-0.5 flex items-center gap-1">
                            {msg.source === "bot" ? (
                              <Bot className="h-3 w-3 opacity-70" />
                            ) : (
                              <User className="h-3 w-3 opacity-70" />
                            )}
                            <span className="text-[10px] opacity-70">
                              {msg.source === "bot" ? "Bot" : "Agente"}
                            </span>
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        <p
                          className={`mt-1 text-right text-[10px] ${
                            msg.fromMe ? "text-white/70" : "text-muted-foreground"
                          }`}
                        >
                          {new Date(msg.timestamp).toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="border-t p-3">
              <div className="flex items-end gap-2">
                <Input
                  placeholder="Escribe un mensaje..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!messageText.trim() || sending}
                  size="icon"
                  className="flex-shrink-0"
                >
                  <SendHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="h-16 w-16 mb-4 opacity-30" />
            <h3 className="text-lg font-medium">Chat Live</h3>
            <p className="mt-1 text-sm">Selecciona una conversacion para comenzar</p>
          </div>
        )}
      </div>

      {/* ── Right Panel: Contact Info ──────────────────────────────── */}
      {showInfo && selectedPhone && (
        <div className="hidden lg:flex w-72 flex-shrink-0 flex-col border-l">
          {/* Contact header */}
          <div className="border-b p-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-3 font-medium">
              {selectedConversation?.pushName || "Sin nombre"}
            </p>
            <p className="text-sm text-muted-foreground">{selectedPhone}</p>
          </div>

          {/* CRM Status */}
          <div className="border-b p-4">
            <h4 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
              Estado CRM
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {CRM_STATUSES.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setCrmStatus(s.label)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                    crmStatus === s.label
                      ? `${s.color} text-white shadow-sm`
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Notes */}
          <div className="flex-1 p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                Notas rapidas
              </h4>
            </div>
            <Textarea
              placeholder="Escribe notas sobre este contacto..."
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              className="min-h-[120px] resize-none text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
