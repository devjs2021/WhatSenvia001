"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { dashboardNavGroups } from "@/config/dashboard-navigation";
import { Clock, AlertTriangle } from "lucide-react";
import { getLicenseStatus } from "@/lib/license-utils";

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useI18n();

  const licenseStatus = getLicenseStatus(user, t);

  return (
    <aside className="w-56 border-r border-slate-100 bg-white flex flex-col justify-between p-4 shrink-0 hidden md:flex sticky top-0 h-screen">
      <div className="space-y-6">
        {/* Logotipo ClickSend */}
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Clock className="h-3.5 w-3.5 text-white" strokeWidth={2} />
          </div>
          <span className="font-display text-xl font-extrabold tracking-tight text-slate-900">
            Click<span className="text-emerald-600">Send</span>
          </span>
        </div>

        {/* Navegación principal - solo grupos */}
        <nav className="space-y-0.5">
          {dashboardNavGroups.map((group) => {
            const isActive = group.children.some(
              (child) => pathname === child.href || pathname.startsWith(child.href + "/")
            );

            return (
              <Link
                key={group.nameKey}
                href={group.href}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-150",
                  isActive
                    ? "text-emerald-600 bg-emerald-50/50"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <group.icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span>{t(group.nameKey)}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Estado de la Cuenta */}
      <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 space-y-2">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "w-2 h-2 rounded-full",
            licenseStatus?.type === "warning" ? "bg-amber-500" : "bg-emerald-500",
            !licenseStatus && "bg-emerald-500"
          )} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {user?.role === "admin" ? t("sidebar.admin") : t("sidebar.account")}
          </span>
        </div>
        <div>
          {licenseStatus ? (
            <>
              <p className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                {licenseStatus.type === "warning" && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                {licenseStatus.type === "expired" && <AlertTriangle className="w-3 h-3 text-red-500" />}
                {licenseStatus.message}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {licenseStatus.type === "warning"
                  ? t("sidebar.renewSoon")
                  : licenseStatus.type === "expired"
                  ? t("sidebar.renewNow")
                  : t("sidebar.allGood")}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-slate-900">
                {user?.role === "admin" ? t("sidebar.admin") : t("sidebar.protectionTitle")}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {user?.role === "admin"
                  ? t("sidebar.adminDesc")
                  : t("sidebar.protectionDesc")}
              </p>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
