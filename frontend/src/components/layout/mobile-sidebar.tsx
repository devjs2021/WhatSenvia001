"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { dashboardNavGroups } from "@/config/dashboard-navigation";
import { Clock, X, AlertTriangle, LogOut } from "lucide-react";

function getLicenseStatus(user: any, t: (key: string, params?: Record<string, any>) => string) {
  if (!user || user.role === "admin") return null;

  const license = user.license;
  if (!license) return { type: "none" as const, message: t('license.noLicense') };
  if (license.status === "suspended") return { type: "suspended" as const, message: t('license.suspended') };
  if (license.status === "expired") return { type: "expired" as const, message: t('license.expired') };
  if (license.status === "cancelled") return { type: "expired" as const, message: t('license.cancelled') };

  if (license.expiresAt) {
    const daysLeft = Math.ceil((new Date(license.expiresAt).getTime() - Date.now()) / 86400000);
    if (daysLeft <= 0) return { type: "expired" as const, message: t('license.expired') };
    if (daysLeft <= 3) return { type: "warning" as const, message: t('license.expiresIn', {days: daysLeft}) };
  }

  return null;
}

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const licenseStatus = getLicenseStatus(user, t);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sidebar panel */}
      <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-20 border-b border-slate-100">
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

        {/* Navigation - solo grupos */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {dashboardNavGroups.map((group) => {
            const isActive = group.children.some(
              (child) => pathname === child.href || pathname.startsWith(child.href + "/")
            );

            return (
              <Link
                key={group.nameKey}
                href={group.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors duration-150",
                  isActive
                    ? "text-emerald-600 bg-emerald-50/50"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <group.icon className="w-5 h-5 shrink-0" strokeWidth={1.5} />
                <span>{t(group.nameKey)}</span>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-3 pb-4 border-t border-slate-100 pt-3">
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
