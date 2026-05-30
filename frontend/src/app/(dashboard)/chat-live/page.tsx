"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse, WhatsAppSession } from "@/types";
import { toast } from "sonner";
import { MessageSquare, LayoutList, Columns3 } from "lucide-react";
import { useI18n } from "@/i18n";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { ChatContactList } from "@/components/chat-live/ChatContactList";
import { ChatMessageArea } from "@/components/chat-live/ChatMessageArea";
import { ChatKanbanView } from "@/components/chat-live/ChatKanbanView";
import { ChatCrmPanel } from "@/components/chat-live/ChatCrmPanel";
import type { ChatContact, ChatMessage, FilterMode, ViewMode } from "@/components/chat-live/chat-types";

export default function ChatLivePage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showCrmPanel, setShowCrmPanel] = useState(false);

  // Sessions
  const { data: sessionsData } = useQuery({
    queryKey: ["whatsapp-sessions"],
    queryFn: () => api.get<ApiResponse<WhatsAppSession[]>>("/whatsapp/sessions"),
  });
  const sessions = (sessionsData?.data || []).filter((s) => s.status === "connected");
  const metaSessions = sessions.filter((s) => s.connectionType === "meta_cloud");
  const baileysSessions = sessions.filter((s) => s.connectionType !== "meta_cloud");

  const querySessionId = filterMode === "all" ? "all" : filterMode;

  // Contacts
  const { data: contactsData } = useQuery({
    queryKey: ["chat-contacts", querySessionId],
    queryFn: () => api.get<ChatContact[]>(`/chat/conversations?sessionId=${querySessionId}`),
    enabled: sessions.length > 0,
    refetchInterval: 10000,
  });
  const contacts = contactsData || [];

  const effectiveSessionId = filterMode === "all" ? activeSessionId : filterMode;

  // Messages
  const { data: messagesData } = useQuery({
    queryKey: ["chat-messages", effectiveSessionId, selectedContact],
    queryFn: () => api.get<ChatMessage[]>(`/chat/messages?sessionId=${effectiveSessionId}&phone=${selectedContact}`),
    enabled: !!effectiveSessionId && !!selectedContact,
    refetchInterval: 5000,
  });
  const messages = messagesData || [];

  const selectedContactObj = contacts.find((c) => c.phone === selectedContact) || null;

  function formatPhone(session: WhatsAppSession): string {
    if (session.phone) return session.phone.replace(/[^0-9+]/g, "").replace(/(\+\d{2})(\d{3})(\d{3})(\d{4})/, "$1 $2 $3$4");
    return "";
  }

  function handleSelectContact(contact: ChatContact) {
    setSelectedContact(contact.phone);
    if (filterMode === "all" && contact.sessionId) setActiveSessionId(contact.sessionId);
    if (viewMode === "kanban") setViewMode("chat");
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error(t("chatLive.fileTooLarge")); return; }
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
        const apiBase = process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api`
          : "/api";
        const res = await fetch(`${apiBase}/chat/upload`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || t("chatLive.sendError")); }
        const data = await res.json();
        mediaUrl = data.url;
        mediaType = data.mediaType;
      }
      await api.post("/chat/send", { sessionId: effectiveSessionId, phone: selectedContact, text: messageText.trim(), mediaUrl, mediaType });
      setMessageText("");
      clearAttachment();
      queryClient.invalidateQueries({ queryKey: ["chat-messages", effectiveSessionId, selectedContact] });
      queryClient.invalidateQueries({ queryKey: ["chat-contacts", querySessionId] });
    } catch (err: any) {
      toast.error(err.message || t("chatLive.sendError"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header - fixed */}
      <div className="shrink-0 space-y-2 md:space-y-3 pb-2">
        <DashboardHeader
          title={
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t("chatLive.title")}
            </div>
          }
          description={t("chatLive.description")}
        >
          {/* View toggle */}
          <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("chat")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === "chat" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              {t("chatLive.viewChat")}
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === "kanban" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Columns3 className="h-3.5 w-3.5" />
              {t("chatLive.viewKanban")}
            </button>
          </div>
        </DashboardHeader>

        {/* Filter buttons - fixed */}
        {sessions.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => { setFilterMode("all"); setSelectedContact(null); setActiveSessionId(""); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all border whitespace-nowrap ${
                filterMode === "all" ? "bg-slate-900 border-slate-900 text-white" : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <MessageSquare className="h-3 w-3 inline mr-1" />
              {t("chatLive.allChat")}
            </button>
            {metaSessions.map((s) => (
              <button
                key={s.id}
                onClick={() => { setFilterMode(s.id); setSelectedContact(null); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all border whitespace-nowrap ${
                  filterMode === s.id ? "bg-blue-50 border-blue-500 text-blue-600" : "border-slate-200 text-slate-500 hover:bg-blue-50/50"
                }`}
              >
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${filterMode === s.id ? "bg-blue-500" : "bg-blue-400"}`} />
                Meta {formatPhone(s)}
              </button>
            ))}
            {baileysSessions.map((s) => (
              <button
                key={s.id}
                onClick={() => { setFilterMode(s.id); setSelectedContact(null); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all border whitespace-nowrap ${
                  filterMode === s.id ? "bg-emerald-50 border-emerald-500 text-emerald-600" : "border-slate-200 text-slate-500 hover:bg-emerald-50/50"
                }`}
              >
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${filterMode === s.id ? "bg-emerald-500" : "bg-emerald-400"}`} />
                WhatsApp {formatPhone(s)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 min-h-0">
        {sessions.length === 0 ? (
          <DashboardCard>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="h-10 w-10 text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-900">{t("chatLive.noSessions")}</h3>
              <p className="text-[11px] text-slate-400 mt-1">{t("chatLive.noSessionsDesc")}</p>
            </div>
          </DashboardCard>
        ) : viewMode === "kanban" ? (
          <ChatKanbanView
            contacts={contacts}
            onSelectContact={handleSelectContact}
            querySessionId={querySessionId}
          />
        ) : (
          /* Chat view */
          <div className="flex flex-col lg:flex-row gap-3 h-full min-h-0">
            {/* Contact list */}
            <ChatContactList
              contacts={contacts}
              selectedPhone={selectedContact}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onSelect={handleSelectContact}
              hidden={!!selectedContact}
            />

            {/* Chat area */}
            <ChatMessageArea
              contact={selectedContactObj}
              messages={messages}
              messageText={messageText}
              onMessageChange={setMessageText}
              onSend={handleSend}
              sending={sending}
              attachedFile={attachedFile}
              attachedPreview={attachedPreview}
              onFileSelect={handleFileSelect}
              onClearAttachment={clearAttachment}
              onBack={() => setSelectedContact(null)}
              onToggleCrm={() => setShowCrmPanel(!showCrmPanel)}
            />

            {/* CRM Panel */}
            {selectedContactObj && showCrmPanel && (
              <ChatCrmPanel
                contact={selectedContactObj}
                onClose={() => setShowCrmPanel(false)}
                querySessionId={querySessionId}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
