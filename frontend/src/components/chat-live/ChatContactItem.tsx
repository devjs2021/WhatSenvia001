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
  unread?: number;
}

export function ChatContactItem({ contact, isSelected, onClick, compact = false, draggable, onDragStart, unread = 0 }: ChatContactItemProps) {
  return (
    <button
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      className={cn(
        "w-full text-left rounded-xl border transition-colors active:scale-[0.98]",
        "px-3 py-3 lg:px-2.5 lg:py-2",
        isSelected
          ? "border-emerald-500 bg-emerald-50"
          : unread > 0
          ? "border-transparent bg-emerald-50/30 hover:bg-emerald-50/50"
          : "border-transparent hover:bg-slate-50 active:bg-slate-100"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 lg:gap-2 min-w-0">
          <div className={cn(
            "h-11 w-11 lg:h-9 lg:w-9 rounded-full flex items-center justify-center shrink-0",
            unread > 0 ? "bg-emerald-100" : "bg-slate-100"
          )}>
            <User className={cn("h-5 w-5 lg:h-4 lg:w-4", unread > 0 ? "text-emerald-500" : "text-slate-400")} />
          </div>
          <div className="min-w-0">
            <p className={cn(
              "text-sm lg:text-xs truncate",
              unread > 0 ? "font-bold text-slate-900" : "font-semibold text-slate-800"
            )}>
              {getContactDisplayName(contact)}
            </p>
            {contact.lastMessage && (
              <p className={cn(
                "text-xs lg:text-[11px] truncate mt-0.5",
                unread > 0 ? "text-slate-600 font-medium" : "text-slate-400"
              )}>
                {getContactMediaPrefix(contact.mediaType)}{contact.lastMessage}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {contact.lastMessageAt && (
            <span className={cn(
              "text-[11px] lg:text-[10px]",
              unread > 0 ? "text-emerald-600 font-semibold" : "text-slate-400"
            )}>
              {formatTime(contact.lastMessageAt)}
            </span>
          )}
          {unread > 0 && (
            <span className="h-5 min-w-[20px] lg:h-4 lg:min-w-[16px] rounded-full bg-emerald-500 text-white text-[11px] lg:text-[10px] font-bold flex items-center justify-center px-1.5">
              {unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
