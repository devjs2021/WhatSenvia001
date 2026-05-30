"use client";

import { Search } from "lucide-react";
import { useI18n } from "@/i18n";
import type { ChatContact } from "./chat-types";
import { ChatContactItem } from "./ChatContactItem";

interface ChatContactListProps {
  contacts: ChatContact[];
  selectedPhone: string | null;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  onSelect: (contact: ChatContact) => void;
  hidden?: boolean;
}

export function ChatContactList({ contacts, selectedPhone, searchTerm, onSearchChange, onSelect, hidden }: ChatContactListProps) {
  const { t } = useI18n();

  const filtered = contacts.filter((c) => {
    const phone = c.phone || "";
    const name = c.name || c.pushName || c.contactName || "";
    const s = searchTerm.toLowerCase();
    return phone.includes(s) || name.toLowerCase().includes(s);
  });

  return (
    <div className={`w-full lg:w-60 flex flex-col ${hidden ? "hidden lg:flex" : "flex"}`}>
      <div className="relative mb-1.5">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <input
          placeholder={t("chatLive.searchContact")}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 w-full"
        />
      </div>
      <div className="flex-1 overflow-y-auto space-y-0.5">
        {filtered.length === 0 ? (
          <p className="text-[11px] text-slate-400 p-2 text-center">{t("chatLive.noContacts")}</p>
        ) : (
          filtered.map((contact) => (
            <ChatContactItem
              key={contact.phone}
              contact={contact}
              isSelected={selectedPhone === contact.phone}
              onClick={() => onSelect(contact)}
            />
          ))
        )}
      </div>
    </div>
  );
}
