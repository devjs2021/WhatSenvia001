export interface ChatContact {
  phone: string;
  name?: string;
  pushName?: string;
  contactId?: string;
  contactName?: string;
  tags?: string[];
  notes?: string;
  stage?: "new" | "in_progress" | "waiting" | "closed";
  email?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unread?: number;
  isOnline?: boolean;
  mediaType?: string;
  sessionId?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  direction: "incoming" | "outgoing";
  status?: string;
  createdAt: string;
  mediaUrl?: string;
  mediaType?: string;
}

export type FilterMode = "all" | string;
export type ViewMode = "chat" | "kanban";
export type ConversationStage = "new" | "in_progress" | "waiting" | "closed";

export const KANBAN_COLUMNS: { id: ConversationStage; labelKey: string; color: string; border: string; bg: string }[] = [
  { id: "new", labelKey: "chatLive.kanban.new", color: "text-blue-700", border: "border-t-blue-400", bg: "bg-blue-50" },
  { id: "in_progress", labelKey: "chatLive.kanban.inProgress", color: "text-amber-700", border: "border-t-amber-400", bg: "bg-amber-50" },
  { id: "waiting", labelKey: "chatLive.kanban.waiting", color: "text-orange-700", border: "border-t-orange-400", bg: "bg-orange-50" },
  { id: "closed", labelKey: "chatLive.kanban.closed", color: "text-slate-500", border: "border-t-slate-300", bg: "bg-slate-50" },
];
