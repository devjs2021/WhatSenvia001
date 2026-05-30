"use client";

import { useRef, useEffect } from "react";
import { useI18n } from "@/i18n";
import {
  Send, Loader2, User, Paperclip, X, FileText, Download, ArrowLeft,
} from "lucide-react";
import type { ChatContact, ChatMessage } from "./chat-types";
import { formatTime, getContactDisplayName } from "./chat-utils";

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
}

export function ChatMessageArea({
  contact, messages, messageText, onMessageChange, onSend, sending,
  attachedFile, attachedPreview, onFileSelect, onClearAttachment, onBack, onToggleCrm,
}: ChatMessageAreaProps) {
  const { t } = useI18n();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        return <img src={msg.mediaUrl} alt="" className="max-w-full rounded-lg mb-1 cursor-pointer max-h-48 object-contain" onClick={() => window.open(msg.mediaUrl, "_blank")} />;
      case "video":
        return <video controls className="max-w-full rounded-lg mb-1 max-h-48"><source src={msg.mediaUrl} /></video>;
      case "audio":
        return <audio controls className="w-full mb-1"><source src={msg.mediaUrl} /></audio>;
      case "document":
        return (
          <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer"
            className={`flex items-center gap-2 mb-1 px-2.5 py-1.5 rounded-lg transition-colors text-xs ${
              isOutgoing ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-700"
            }`}>
            <Download className="h-3.5 w-3.5 shrink-0" />
            <span className="underline truncate">{msg.content && !msg.content.startsWith("[") ? msg.content : t("chatLive.downloadDoc")}</span>
          </a>
        );
      default: return null;
    }
  }

  return (
    <div className="flex-1 min-w-0 rounded-2xl border border-slate-100 bg-white flex flex-col h-full max-h-full">
      {/* Header - fixed */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="lg:hidden h-7 w-7 rounded-lg flex items-center justify-center hover:bg-slate-50 text-slate-400 shrink-0">
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <User className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">{getContactDisplayName(contact)}</p>
            <p className="text-[11px] text-slate-400">{contact.phone}</p>
          </div>
        </div>
        {onToggleCrm && (
          <button onClick={onToggleCrm} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-slate-600 text-[11px] font-bold">
            CRM
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 px-2 py-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <img src="/illustrations/PersonaEscribiendo.png" alt="" className="h-20 w-auto mb-2 opacity-80" />
            <p className="text-[11px] text-slate-400">{t("chatLive.noMessages")}</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isOutgoing = msg.direction === "outgoing";
            const showText = msg.content && !msg.content.match(/^\[(image|video|audio|document)\]$/i);
            return (
              <div key={msg.id || i} className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-xl px-3 py-1.5 ${
                  isOutgoing ? "bg-emerald-500 text-white rounded-br-sm" : "bg-slate-100 text-slate-800 rounded-bl-sm"
                }`}>
                  {renderMedia(msg)}
                  {showText && <p className="text-[13px] leading-snug">{msg.content}</p>}
                  <div className={`flex items-center gap-1 mt-0.5 ${isOutgoing ? "justify-end" : "justify-start"}`}>
                    <span className={`text-[10px] ${isOutgoing ? "text-emerald-200" : "text-slate-400"}`}>
                      {formatTime(msg.createdAt)}
                    </span>
                    {isOutgoing && msg.status && (
                      <span className="text-[10px] text-emerald-200">
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
        <div className="flex items-center gap-2 mx-2 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
          {attachedPreview ? (
            <img src={attachedPreview} className="h-10 w-10 rounded object-cover" alt="" />
          ) : (
            <FileText className="h-4 w-4 text-slate-400 shrink-0" />
          )}
          <span className="text-[11px] text-slate-600 truncate flex-1">{attachedFile.name}</span>
          <span className="text-[10px] text-slate-400 shrink-0">{(attachedFile.size / 1024 / 1024).toFixed(1)} MB</span>
          <button onClick={onClearAttachment} className="shrink-0 hover:bg-slate-200 rounded p-0.5">
            <X className="h-3.5 w-3.5 text-slate-400" />
          </button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={onSend} className="flex gap-1.5 p-2 border-t border-slate-100">
        <input type="file" ref={fileInputRef} className="hidden" onChange={onFileSelect}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip" />
        <button type="button" onClick={() => fileInputRef.current?.click()}
          className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-colors shrink-0">
          <Paperclip className="h-3.5 w-3.5 text-slate-400" />
        </button>
        <input
          placeholder={t("chatLive.writeMessage")}
          value={messageText}
          onChange={(e) => onMessageChange(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 flex-1"
        />
        <button type="submit" disabled={(!messageText.trim() && !attachedFile) || sending}
          className="h-8 w-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-all disabled:opacity-50 shrink-0">
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </button>
      </form>
    </div>
  );
}
