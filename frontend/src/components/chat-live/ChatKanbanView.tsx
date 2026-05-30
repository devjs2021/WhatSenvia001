"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/i18n";
import { ChevronRight } from "lucide-react";
import type { ChatContact, ConversationStage } from "./chat-types";
import { KANBAN_COLUMNS } from "./chat-types";
import { ChatContactItem } from "./ChatContactItem";

interface ChatKanbanViewProps {
  contacts: ChatContact[];
  onSelectContact: (contact: ChatContact) => void;
  querySessionId: string;
}

export function ChatKanbanView({ contacts, onSelectContact, querySessionId }: ChatKanbanViewProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const stageMutation = useMutation({
    mutationFn: ({ phone, stage }: { phone: string; stage: string }) =>
      api.patch("/chat/conversations/stage", { phone, stage }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat-contacts"] }),
  });

  function handleDrop(e: React.DragEvent, targetStage: ConversationStage) {
    e.preventDefault();
    const phone = e.dataTransfer.getData("phone");
    if (phone) stageMutation.mutate({ phone, stage: targetStage });
  }

  function moveContact(phone: string, currentIdx: number, direction: 1 | -1) {
    const nextIdx = currentIdx + direction;
    if (nextIdx < 0 || nextIdx >= KANBAN_COLUMNS.length) return;
    stageMutation.mutate({ phone, stage: KANBAN_COLUMNS[nextIdx].id });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {KANBAN_COLUMNS.map((col, colIdx) => {
        const colContacts = contacts.filter(
          (c) => (c.stage || "new") === col.id
        );

        return (
          <div
            key={col.id}
            className={`rounded-2xl border border-slate-100 bg-white border-t-2 ${col.border} flex flex-col`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-2">
              <span className={`text-xs font-bold ${col.color}`}>
                {t(col.labelKey)}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${col.bg} ${col.color}`}>
                {colContacts.length}
              </span>
            </div>

            {/* Column body */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5 max-h-[calc(100vh-280px)]">
              {colContacts.length === 0 ? (
                <p className="text-[10px] text-slate-300 text-center py-6">{t("chatLive.kanban.empty")}</p>
              ) : (
                colContacts.map((contact) => (
                  <div key={contact.phone} className="group relative">
                    <ChatContactItem
                      contact={contact}
                      onClick={() => onSelectContact(contact)}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("phone", contact.phone)}
                    />
                    {/* Move buttons */}
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {colIdx > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); moveContact(contact.phone, colIdx, -1); }}
                          className="h-5 w-5 rounded bg-white shadow border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                        >
                          <ChevronRight className="h-3 w-3 text-slate-400 rotate-180" />
                        </button>
                      )}
                      {colIdx < KANBAN_COLUMNS.length - 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); moveContact(contact.phone, colIdx, 1); }}
                          className="h-5 w-5 rounded bg-white shadow border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                        >
                          <ChevronRight className="h-3 w-3 text-slate-400" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
