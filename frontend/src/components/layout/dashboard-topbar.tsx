"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { findGroupByHref } from "@/config/dashboard-navigation";
import {
  Headphones,
  Globe,
  LogOut,
  ChevronDown,
  Menu,
  Bell,
} from "lucide-react";

const SUPPORT_PHONE = "573202101789";
const SUPPORT_MESSAGE = "Hola, necesito ayuda con mi cuenta de ClickSend";

const breadcrumbTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/whatsapp": "Conexión WhatsApp",
  "/bot-builder": "Bot Builder",
  "/chat-live": "Chat en Vivo",
  "/campaigns": "Campañas",
  "/campaign-control": "Control de Campañas",
  "/campaign-monitor": "Monitor de Campañas",
  "/scheduled": "Programados",
  "/templates": "Plantillas",
  "/meta-templates": "Plantillas de Meta",
  "/poll-results": "Encuestas",
  "/contacts": "Contactos",
  "/extract-contacts": "Extraer Contactos",
  "/import": "Importar",
  "/messages": "Mensajes",
  "/reports": "Reportes",
  "/settings": "Configuración",
  "/admin": "Panel de Administración",
};

interface DashboardTopbarProps {
  onMobileMenuToggle: () => void;
}

export function DashboardTopbar({ onMobileMenuToggle }: DashboardTopbarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentLocale = mounted ? locale : "es";
  const supportUrl = `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(SUPPORT_MESSAGE)}`;

  // Determinar el título del breadcrumb
  const currentTitle = Object.entries(breadcrumbTitles).find(([key]) =>
    pathname === key || pathname.startsWith(key + "/")
  )?.[1] || "Dashboard";

  // Grupo activo para el sub-nav
  const activeGroup = findGroupByHref(pathname);

  return (
    <header className="border-b border-slate-100 bg-white shrink-0">
      <div className="flex items-center justify-between px-6 md:px-10 h-20">
        {/* Breadcrumb / Título */}
        <div className="shrink-0">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            ClickSend Consola
          </span>
          <h2 className="font-display text-lg font-bold text-slate-900 mt-0.5">
            {currentTitle}
          </h2>
        </div>

        {/* Sub-nav centrado */}
        {activeGroup && activeGroup.children.length > 1 && (
          <nav className="flex items-center gap-1 overflow-x-auto mx-4 flex-1 justify-center">
            {activeGroup.children.map((child) => {
              const isActive = pathname === child.href || pathname.startsWith(child.href + "/");
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150",
                    isActive
                      ? "bg-emerald-50 text-emerald-700 shadow-sm"
                      : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <child.icon className="w-3.5 h-3.5 shrink-0 text-emerald-500" strokeWidth={1.5} />
                  <span>{child.nameKey}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Acciones rápidas & Perfil */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Estado Conectado a Meta */}
          <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
            <svg
              className="w-4 h-4 text-emerald-600 fill-current"
              viewBox="0 0 24 24"
            >
              <path d="M16.4 6c-1.8 0-3.4 1-4.4 2.5C11 7 9.4 6 7.6 6 4.5 6 2 8.5 2 11.6s2.5 5.6 5.6 5.6c1.8 0 3.4-1 4.4-2.5 1 1.5 2.6 2.5 4.4 2.5 3.1 0 5.6-2.5 5.6-5.6S19.5 6 16.4 6zm-8.8 9.2c-2 0-3.6-1.6-3.6-3.6S5.6 8 7.6 8c1.3 0 2.5.7 3.1 1.8-.8 1.4-.8 3.2 0 4.6-.6 1.1-1.8 1.8-3.1 1.8zm8.8 0c-1.3 0-2.5-.7-3.1-1.8.8-1.4.8-3.2 0-4.6.6-1.1 1.8-1.8 3.1-1.8 2 0 3.6 1.6 3.6 3.6s-1.6 3.6-3.6 3.6z" />
            </svg>
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Conectado a Meta
            </span>
          </div>

          {/* Soporte */}
          <a
            href={supportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
            title={t("nav.support")}
          >
            <Headphones className="w-5 h-5" strokeWidth={1.5} />
          </a>

          {/* Notificaciones */}
          <button className="w-10 h-10 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors relative">
            <Bell className="w-5 h-5" strokeWidth={1.5} />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500" />
          </button>

          {/* Avatar / User Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 border border-slate-100 rounded-xl px-3 py-2 hover:bg-slate-50 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-xs font-bold text-emerald-700">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
              <span className="hidden md:inline text-xs font-medium text-slate-600 max-w-[80px] truncate">
                {user?.name || t("auth.user")}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" strokeWidth={2} />
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl border border-slate-100 shadow-lg py-1.5 z-20">
                  <div className="px-4 py-2 border-b border-slate-50">
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
                  <div className="px-2 py-1 space-y-0.5">
                    <button
                      onClick={() =>
                        setLocale(currentLocale === "es" ? "en" : "es")
                      }
                      className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5" strokeWidth={1.5} />
                      {currentLocale === "es" ? "English" : "Español"}
                    </button>
                    <Link
                      href="/privacy-policy"
                      className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      {t("nav.privacyPolicy")}
                    </Link>
                    <button
                      onClick={logout}
                      className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                      {t("auth.logout")}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden w-10 h-10 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Menu className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  );
}
