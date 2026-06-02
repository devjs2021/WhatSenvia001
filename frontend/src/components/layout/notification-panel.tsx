"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n";
import { useNotifications, type Notification } from "@/hooks/use-notifications";
import {
  Bell, MessageSquare, CheckCircle2, XCircle, AlertTriangle, CalendarClock,
  X, Check,
} from "lucide-react";

const typeConfig: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  new_chat: { icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-50" },
  campaign_completed: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  campaign_failed: { icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
  system_error: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
  campaign_scheduled: { icon: CalendarClock, color: "text-violet-600", bg: "bg-violet-50" },
};

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const { locale } = useI18n();
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  if (!open) return null;

  function handleClick(n: Notification) {
    if (!n.read) markAsRead(n.id);
    const meta = n.metadata ? JSON.parse(n.metadata) : {};
    if (n.type === "new_chat" && meta.phone) {
      router.push("/chat-live");
    } else if (n.type === "campaign_completed" || n.type === "campaign_failed") {
      router.push("/campaigns");
    } else if (n.type === "campaign_scheduled") {
      router.push("/campaigns");
    }
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[380px] bg-white rounded-2xl border border-slate-100 shadow-xl z-50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              {locale === "es" ? "Notificaciones" : "Notifications"}
            </h3>
            {unreadCount > 0 && (
              <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                <Check className="h-3 w-3" />
                {locale === "es" ? "Marcar todas" : "Mark all"}
              </button>
            )}
            <button
              onClick={onClose}
              className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-slate-50 text-slate-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="max-h-[400px] overflow-y-auto overscroll-contain">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-8 w-8 text-slate-200 mb-2" />
              <p className="text-xs text-slate-400">
                {locale === "es" ? "Sin notificaciones" : "No notifications"}
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const config = typeConfig[n.type] || typeConfig.system_error;
              const Icon = config.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 active:bg-slate-100 transition-colors ${
                    !n.read ? "bg-slate-50/50" : ""
                  }`}
                >
                  <div className={`h-9 w-9 rounded-xl ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs leading-snug truncate ${!n.read ? "font-bold text-slate-900" : "font-medium text-slate-600"}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                        {formatTimeAgo(n.createdAt)}
                      </span>
                    </div>
                    {n.body && (
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{n.body}</p>
                    )}
                  </div>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-2" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
