"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/i18n";
import { X, Plus, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ChatContact, ConversationStage } from "./chat-types";
import { KANBAN_COLUMNS } from "./chat-types";
import { getContactDisplayName } from "./chat-utils";
import { toast } from "sonner";

interface ChatCrmPanelProps {
  contact: ChatContact;
  onClose: () => void;
  querySessionId: string;
}

export function ChatCrmPanel({ contact, onClose, querySessionId }: ChatCrmPanelProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(contact.notes || "");
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    setNotes(contact.notes || "");
  }, [contact.phone, contact.notes]);

  const stageMutation = useMutation({
    mutationFn: ({ phone, stage }: { phone: string; stage: string }) =>
      api.patch("/chat/conversations/stage", { phone, stage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-contacts"] });
      toast.success(t("chatLive.crm.saved"));
    },
  });

  const notesMutation = useMutation({
    mutationFn: ({ phone, notes }: { phone: string; notes: string }) =>
      api.patch("/chat/conversations/notes", { phone, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-contacts"] });
    },
  });

  const tagsMutation = useMutation({
    mutationFn: ({ phone, tags }: { phone: string; tags: string[] }) =>
      api.patch("/chat/conversations/tags", { phone, tags }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-contacts"] });
    },
  });

  function handleSaveNotes() {
    if (notes !== (contact.notes || "")) {
      notesMutation.mutate({ phone: contact.phone, notes });
    }
  }

  function handleAddTag() {
    if (!newTag.trim()) return;
    const currentTags = contact.tags || [];
    if (currentTags.includes(newTag.trim())) { setNewTag(""); return; }
    tagsMutation.mutate({ phone: contact.phone, tags: [...currentTags, newTag.trim()] });
    setNewTag("");
  }

  function handleRemoveTag(tag: string) {
    const currentTags = contact.tags || [];
    tagsMutation.mutate({ phone: contact.phone, tags: currentTags.filter((t) => t !== tag) });
  }

  return (
    <div className="w-full lg:w-56 rounded-2xl border border-slate-100 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t("chatLive.crm.contactInfo")}</span>
        <button onClick={onClose} className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-slate-50 text-slate-400">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Contact info */}
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-slate-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">{getContactDisplayName(contact)}</p>
            <p className="text-[10px] text-slate-400 font-mono">{contact.phone}</p>
            {contact.email && <p className="text-[10px] text-slate-400 truncate">{contact.email}</p>}
          </div>
        </div>

        {/* Stage */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t("chatLive.crm.stage")}</p>
          <div className="grid grid-cols-2 gap-1">
            {KANBAN_COLUMNS.map((col) => (
              <button
                key={col.id}
                onClick={() => stageMutation.mutate({ phone: contact.phone, stage: col.id })}
                className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all border ${
                  (contact.stage || "new") === col.id
                    ? `${col.bg} ${col.color} border-current`
                    : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {t(col.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t("chatLive.crm.tags")}</p>
          <div className="flex flex-wrap gap-1 mb-1.5">
            {(contact.tags || []).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] gap-1 pr-1">
                {tag}
                <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500">
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              placeholder={t("chatLive.crm.addTag")}
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
            <button onClick={handleAddTag} disabled={!newTag.trim()}
              className="h-6 w-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center disabled:opacity-40">
              <Plus className="h-3 w-3 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t("chatLive.crm.notes")}</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleSaveNotes}
            placeholder={t("chatLive.crm.notesPlaceholder")}
            rows={4}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-700 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
          />
        </div>
      </div>
    </div>
  );
}
