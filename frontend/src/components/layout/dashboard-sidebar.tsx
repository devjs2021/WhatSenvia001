"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { dashboardNavGroups } from "@/config/dashboard-navigation";
import { Clock, AlertTriangle } from "lucide-react";

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

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, hasFeature } = useAuth();
  const { t } = useI18n();

  const licenseStatus = getLicenseStatus(user, t);

  return (
    <aside className="w-64 border-r border-slate-100 bg-white flex flex-col justify-between p-6 shrink-0 hidden md:flex sticky top-0 h-screen">
      <div className="space-y-8">
        {/* Logotipo ClickSend */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Clock className="h-4 w-4 text-white" strokeWidth={2} />
          </div>
          <span className="font-display text-2xl font-extrabold tracking-tight text-slate-900">
            Click<span className="text-emerald-600">Send</span>
          </span>
        </div>

        {/* Navegación principal - solo grupos */}
        <nav className="space-y-1">
          {dashboardNavGroups.map((group) => {
            const isActive = group.children.some(
              (child) => pathname === child.href || pathname.startsWith(child.href + "/")
            );

            return (
              <Link
                key={group.nameKey}
                href={group.href}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors duration-150",
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
      </div>

      {/* Estado de la Cuenta */}
      <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
        <div className="flex items-center gap-2">
          <span className={cn(
            "w-2.5 h-2.5 rounded-full",
            licenseStatus?.type === "warning" ? "bg-amber-500" : "bg-emerald-500",
            !licenseStatus && "bg-emerald-500"
          )} />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {t('dashboard.accountHealth') || "Salud de Cuenta"}
          </span>
        </div>
        <div>
          {licenseStatus ? (
            <>
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                {licenseStatus.type === "warning" && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                {licenseStatus.type === "expired" && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                {licenseStatus.message}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {licenseStatus.type === "warning"
                  ? t('license.renewSoon') || "Renueva pronto para evitar interrupciones."
                  : licenseStatus.type === "expired"
                  ? t('license.renewNow') || "Renueva tu licencia para continuar."
                  : t('license.active') || "Todo en orden."}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-900">
                {user?.role === "admin" ? t('license.admin') || "Administrador" : "Excelente protección"}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {user?.role === "admin"
                  ? t('license.adminDesc') || "Control total del sistema."
                  : "Límites optimizados para evitar spam de Meta."}
              </p>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
