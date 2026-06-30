"use client";

import { useRef, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/i18n";
import {
  Send, Loader2, User, Paperclip, X, FileText, Download, ArrowLeft, MoreVertical, LayoutTemplate, Search,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { ChatContact, ChatMessage } from "./chat-types";
import { formatTime, getContactDisplayName } from "./chat-utils";
import type { SessionColor } from "@/lib/session-colors";

interface MetaTemplate {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components: any[];
}

interface ChatMessageAreaProps {
  contact: ChatContact | null;
  messages: ChatMessage[];
  messageText: string;
  onMessageChange: (v: string) => void;
  onSend: (e: React.FormEvent) => void;
  sending: boolean;
  attachedFile: File | null;
  attachedPreview: string | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearAttachment: () => void;
  onBack: () => void;
  onToggleCrm?: () => void;
  accountColor?: SessionColor;
  accountLabel?: string;
  sessionId?: string;
}

export function ChatMessageArea({
  contact, messages, messageText, onMessageChange, onSend, sending,
  attachedFile, attachedPreview, onFileSelect, onClearAttachment, onBack, onToggleCrm,
  accountColor, accountLabel, sessionId,
}: ChatMessageAreaProps) {
  const { t } = useI18n();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [sendingTemplate, setSendingTemplate] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch approved templates for current Meta session
  const { data: templatesData } = useQuery({
    queryKey: ["chat-templates", sessionId],
    queryFn: () => api.get<{ success: boolean; data: MetaTemplate[] }>(`/meta-templates?sessionId=${sessionId}`),
    enabled: !!sessionId && showTemplates,
  });

  const approvedTemplates = (templatesData?.data || []).filter((t) => t.status === "APPROVED");
  const filteredTemplates = templateSearch
    ? approvedTemplates.filter((t) => t.name.toLowerCase().includes(templateSearch.toLowerCase()))
    : approvedTemplates;

  async function handleSendTemplate(template: MetaTemplate) {
    if (!contact || !sessionId) return;
    setSendingTemplate(true);
    try {
      await api.post("/chat/send-template", {
        sessionId,
        phone: contact.phone,
        templateName: template.name,
        language: template.language,
      });
      setShowTemplates(false);
      setTemplateSearch("");
      toast.success(`Plantilla "${template.name}" enviada`);
    } catch (err: any) {
      toast.error(err.message || "Error al enviar plantilla");
    } finally {
      setSendingTemplate(false);
    }
  }

  function getTemplatePreview(template: MetaTemplate): string {
    const body = template.components?.find((c: any) => c.type === "BODY");
    return body?.text ? body.text.substring(0, 80) + (body.text.length > 80 ? "…" : "") : "";
  }

  if (!contact) {
    return (
      <div className="flex-1 min-w-0 rounded-2xl border border-slate-100 bg-white flex flex-col items-center justify-center py-12">
        <img src="/illustrations/PersonaEscribiendo.png" alt="" className="h-32 w-auto mb-3 opacity-90" />
        <h3 className="text-sm font-bold text-slate-900">{t("chatLive.selectContact")}</h3>
        <p className="text-[11px] text-slate-400 mt-1">{t("chatLive.selectContactDesc")}</p>
      </div>
    );
  }

  function renderMedia(msg: ChatMessage) {
    if (!msg.mediaUrl) return null;
    const isOutgoing = msg.direction === "outgoing";
    switch (msg.mediaType) {
      case "image":
        return <img src={msg.mediaUrl} alt="" className="max-w-full rounded-lg mb-1 cursor-pointer max-h-52 object-contain" onClick={() => window.open(msg.mediaUrl, "_blank")} />;
      case "video":
        return <video controls className="max-w-full rounded-lg mb-1 max-h-52"><source src={msg.mediaUrl} /></video>;
      case "audio":
        return <audio controls className="w-full mb-1"><source src={msg.mediaUrl} /></audio>;
      case "document":
        return (
          <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer"
            className={`flex items-center gap-2 mb-1 px-3 py-2 rounded-lg transition-colors text-xs ${
              isOutgoing ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-700"
            }`}>
            <Download className="h-4 w-4 shrink-0" />
            <span className="underline truncate">{msg.content && !msg.content.startsWith("[") ? msg.content : t("chatLive.downloadDoc")}</span>
          </a>
        );
      default: return null;
    }
  }

  // Detect if a message is a template placeholder
  function isTemplatePlaceholder(content: string): boolean {
    return /^\[Plantilla:/.test(content);
  }

  return (
    <div className="flex-1 min-w-0 lg:rounded-2xl lg:border lg:border-slate-100 bg-white flex flex-col min-h-0 relative">
      {/* Header */}
      <div className="flex items-center justify-between px-3 lg:px-3 py-2.5 lg:py-2 border-b border-slate-100 shrink-0 bg-white">
        <div className="flex items-center gap-2.5">
          <button onClick={onBack} className="lg:hidden h-9 w-9 rounded-full flex items-center justify-center hover:bg-slate-50 active:bg-slate-100 text-slate-500 shrink-0 -ml-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="relative shrink-0">
            <div className={`h-10 w-10 lg:h-8 lg:w-8 rounded-full bg-slate-100 flex items-center justify-center ${accountColor ? `ring-2 ${accountColor.ring}` : ""}`}>
              <User className="h-5 w-5 lg:h-4 lg:w-4 text-slate-400" />
            </div>
            {accountColor && (
              <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${accountColor.dot}`} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm lg:text-xs font-bold text-slate-900 truncate">{getContactDisplayName(contact)}</p>
            <div className="flex items-center gap-1.5">
              <p className="text-xs lg:text-[11px] text-slate-400">{contact.phone}</p>
              {accountColor && accountLabel && (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${accountColor.badge}`}>
                  {accountLabel}
                </span>
              )}
            </div>
          </div>
        </div>
        {onToggleCrm && (
          <button onClick={onToggleCrm} className="h-9 w-9 lg:h-7 lg:w-7 rounded-full lg:rounded-lg flex items-center justify-center hover:bg-slate-50 active:bg-slate-100 text-slate-400 hover:text-slate-600">
            <MoreVertical className="h-5 w-5 lg:hidden" />
            <span className="hidden lg:block text-[11px] font-bold">CRM</span>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 lg:px-2 py-3 lg:py-2 space-y-1.5"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e2e8f0' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <img src="/illustrations/PersonaEscribiendo.png" alt="" className="h-24 w-auto mb-3 opacity-80" />
            <p className="text-xs text-slate-400">{t("chatLive.noMessages")}</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isOutgoing = msg.direction === "outgoing";
            const isTemplate = isTemplatePlaceholder(msg.content);
            const showText = msg.content && !msg.content.match(/^\[(image|video|audio|document)\]$/i);
            return (
              <div key={msg.id || i} className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] lg:max-w-[75%] rounded-2xl px-3.5 py-2 shadow-sm ${
                  isOutgoing
                    ? "bg-emerald-500 text-white rounded-br-md"
                    : "bg-white text-slate-800 rounded-bl-md border border-slate-100"
                }`}>
                  {isTemplate && (
                    <div className={`flex items-center gap-1.5 mb-1 text-[11px] font-semibold ${isOutgoing ? "text-emerald-100" : "text-slate-400"}`}>
                      <LayoutTemplate className="h-3 w-3" />
                      Plantilla Meta
                    </div>
                  )}
                  {renderMedia(msg)}
                  {showText && <p className="text-[14px] lg:text-[13px] leading-relaxed">{msg.content}</p>}
                  <div className={`flex items-center gap-1 mt-1 ${isOutgoing ? "justify-end" : "justify-start"}`}>
                    <span className={`text-[10px] ${isOutgoing ? "text-emerald-200" : "text-slate-400"}`}>
                      {formatTime(msg.createdAt)}
                    </span>
                    {isOutgoing && msg.status && (
                      <span className={`text-[11px] ${msg.status === "read" ? "text-blue-200" : "text-emerald-200"}`}>
                        {msg.status === "sent" ? "✓" : msg.status === "delivered" ? "✓✓" : msg.status === "read" ? "✓✓" : ""}
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

      {/* Template picker panel */}
      {showTemplates && (
        <div className="absolute bottom-[64px] left-0 right-0 lg:bottom-[56px] bg-white border-t border-slate-100 shadow-lg z-20 rounded-t-2xl lg:rounded-t-xl max-h-72 flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 shrink-0">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <LayoutTemplate className="h-3.5 w-3.5 text-slate-400" />
              Plantillas aprobadas
            </span>
            <button onClick={() => { setShowTemplates(false); setTemplateSearch(""); }}
              className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-400">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="relative px-3 py-2 shrink-0">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              autoFocus
              placeholder="Buscar plantilla..."
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-3 space-y-1.5">
            {!sessionId ? (
              <p className="text-xs text-slate-400 text-center py-4">Solo disponible en sesiones Meta Cloud</p>
            ) : filteredTemplates.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                {approvedTemplates.length === 0 ? "No hay plantillas aprobadas para esta cuenta" : "Sin resultados"}
              </p>
            ) : (
              filteredTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => handleSendTemplate(tpl)}
                  disabled={sendingTemplate}
                  className="w-full text-left rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 px-3 py-2 transition-all group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-emerald-700">{tpl.name}</p>
                    <span className="shrink-0 text-[10px] text-slate-400 font-mono">{tpl.language}</span>
                  </div>
                  {getTemplatePreview(tpl) && (
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{getTemplatePreview(tpl)}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Attachment preview */}
      {attachedFile && (
        <div className="flex items-center gap-2.5 mx-3 lg:mx-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
          {attachedPreview ? (
            <img src={attachedPreview} className="h-12 w-12 rounded-lg object-cover" alt="" />
          ) : (
            <FileText className="h-5 w-5 text-slate-400 shrink-0" />
          )}
          <span className="text-xs text-slate-600 truncate flex-1">{attachedFile.name}</span>
          <span className="text-[11px] text-slate-400 shrink-0">{(attachedFile.size / 1024 / 1024).toFixed(1)} MB</span>
          <button onClick={onClearAttachment} className="shrink-0 hover:bg-slate-200 active:bg-slate-300 rounded-full p-1">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={onSend} className="flex items-end gap-2 p-3 lg:p-2 border-t border-slate-100 bg-white safe-area-bottom">
        <input type="file" ref={fileInputRef} className="hidden" onChange={onFileSelect}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip" />
        <button type="button" onClick={() => fileInputRef.current?.click()}
          className="h-11 w-11 lg:h-9 lg:w-9 rounded-full lg:rounded-lg border border-slate-200 hover:bg-slate-50 active:bg-slate-100 flex items-center justify-center transition-colors shrink-0">
          <Paperclip className="h-5 w-5 lg:h-4 lg:w-4 text-slate-400" />
        </button>
        {sessionId && (
          <button type="button"
            onClick={() => setShowTemplates(!showTemplates)}
            className={`h-11 w-11 lg:h-9 lg:w-9 rounded-full lg:rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
              showTemplates ? "border-emerald-400 bg-emerald-50 text-emerald-600" : "border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-400"
            }`}
            title="Enviar plantilla aprobada"
          >
            <LayoutTemplate className="h-5 w-5 lg:h-4 lg:w-4" />
          </button>
        )}
        <input
          placeholder={t("chatLive.writeMessage")}
          value={messageText}
          onChange={(e) => onMessageChange(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-full lg:rounded-lg px-4 lg:px-3 py-3 lg:py-2 text-sm lg:text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 flex-1 min-w-0"
        />
        <button type="submit" disabled={(!messageText.trim() && !attachedFile) || sending}
          className="h-11 w-11 lg:h-9 lg:w-9 rounded-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center transition-all disabled:opacity-50 shrink-0 shadow-sm">
          {sending ? <Loader2 className="h-5 w-5 lg:h-4 lg:w-4 animate-spin" /> : <Send className="h-5 w-5 lg:h-4 lg:w-4" />}
        </button>
      </form>
    </div>
  );
}
