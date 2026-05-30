"use client";

import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatContact } from "./chat-types";
import { formatTime, getContactMediaPrefix, getContactDisplayName } from "./chat-utils";

interface ChatContactItemProps {
  contact: ChatContact;
  isSelected?: boolean;
  onClick: () => void;
  compact?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export function ChatContactItem({ contact, isSelected, onClick, compact = true, draggable, onDragStart }: ChatContactItemProps) {
  return (
    <button
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      className={cn(
        "w-full text-left rounded-xl border transition-colors",
        compact ? "p-1.5" : "p-2.5",
        isSelected
          ? "border-emerald-500 bg-emerald-50"
          : "border-transparent hover:bg-slate-50"
      )}
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={cn(
            "rounded-full bg-slate-100 flex items-center justify-center shrink-0",
            compact ? "h-7 w-7" : "h-8 w-8"
          )}>
            <User className={cn("text-slate-400", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
          </div>
          <div className="min-w-0">
            <p className={cn("font-medium text-slate-800 truncate", compact ? "text-xs" : "text-sm")}>
              {getContactDisplayName(contact)}
            </p>
            {contact.lastMessage && (
              <p className={cn("text-slate-400 truncate", compact ? "text-[11px]" : "text-xs")}>
                {getContactMediaPrefix(contact.mediaType)}{contact.lastMessage}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          {contact.lastMessageAt && (
            <span className={cn("text-slate-400", compact ? "text-[10px]" : "text-xs")}>
              {formatTime(contact.lastMessageAt)}
            </span>
          )}
          {(contact.unread || 0) > 0 && (
            <span className={cn(
              "rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center",
              compact ? "h-4 min-w-[16px] text-[10px] px-1" : "h-5 min-w-[20px] text-xs px-1"
            )}>
              {contact.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
