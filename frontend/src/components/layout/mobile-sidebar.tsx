"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { dashboardNavGroups } from "@/config/dashboard-navigation";
import { Clock, X, AlertTriangle, LogOut, ChevronDown } from "lucide-react";
import { getLicenseStatus } from "@/lib/license-utils";
import { useChatUnread } from "@/hooks/use-chat-unread";

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const licenseStatus = getLicenseStatus(user, t);
  const { totalUnread } = useChatUnread();

  const [expandedGroup, setExpandedGroup] = useState<string | null>(() => {
    const active = dashboardNavGroups.find((g) =>
      g.children.some((c) => pathname === c.href || pathname.startsWith(c.href + "/"))
    );
    return active?.nameKey || null;
  });

  if (!open) return null;

  function toggleGroup(nameKey: string) {
    setExpandedGroup((prev) => (prev === nameKey ? null : nameKey));
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <aside className="absolute left-0 top-0 bottom-0 w-[85vw] max-w-80 bg-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Clock className="h-4 w-4 text-white" strokeWidth={2} />
            </div>
            <span className="font-display text-xl font-extrabold tracking-tight text-slate-900">
              Click<span className="text-emerald-600">Send</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* License warning */}
        {licenseStatus && (
          <div
            className={cn(
              "mx-3 mt-3 rounded-xl p-3 text-xs font-medium",
              licenseStatus.type === "warning"
                ? "bg-amber-50 border border-amber-200 text-amber-800"
                : "bg-red-50 border border-red-200 text-red-800"
            )}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {licenseStatus.message}
            </div>
          </div>
        )}

        {/* Navigation with expandable groups */}
        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-1">
          {dashboardNavGroups.map((group) => {
            const isGroupActive = group.children.some(
              (child) => pathname === child.href || pathname.startsWith(child.href + "/")
            );
            const hasMultipleChildren = group.children.length > 1;
            const isExpanded = expandedGroup === group.nameKey;

            if (!hasMultipleChildren) {
              const child = group.children[0];
              const isActive = pathname === child.href || pathname.startsWith(child.href + "/");
              return (
                <Link
                  key={group.nameKey}
                  href={child.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors",
                    isActive
                      ? "text-emerald-600 bg-emerald-50/50"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <group.icon className="w-5 h-5 shrink-0" strokeWidth={1.5} />
                  <span className="flex-1">{t(group.nameKey)}</span>
                  {group.nameKey === "nav.messaging" && totalUnread > 0 && (
                    <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {totalUnread > 99 ? "99+" : totalUnread}
                    </span>
                  )}
                </Link>
              );
            }

            return (
              <div key={group.nameKey}>
                <button
                  onClick={() => toggleGroup(group.nameKey)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-colors",
                    isGroupActive
                      ? "text-emerald-600 bg-emerald-50/50"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <group.icon className="w-5 h-5 shrink-0" strokeWidth={1.5} />
                    <span>{t(group.nameKey)}</span>
                    {group.nameKey === "nav.messaging" && totalUnread > 0 && (
                      <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {totalUnread > 99 ? "99+" : totalUnread}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>

                {isExpanded && (
                  <div className="ml-4 pl-4 border-l border-slate-100 mt-0.5 mb-1 space-y-0.5">
                    {group.children.map((child) => {
                      const isActive = pathname === child.href || pathname.startsWith(child.href + "/");
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors",
                            isActive
                              ? "text-emerald-600 bg-emerald-50/50"
                              : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <child.icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                          <span>{t(child.nameKey)}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-3 pb-4 border-t border-slate-100 pt-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {user?.name || t("auth.user")}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.license?.plan
                  ? `${t("license.plan")} ${user.license.plan}`
                  : user?.role === "admin"
                  ? t("license.admin")
                  : t("license.noLicense")}
              </p>
            </div>
            <button
              onClick={logout}
              className="text-slate-400 hover:text-red-500 transition-colors p-1.5"
              title={t("auth.logout")}
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
