"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  Users,
  Send,
  MessageSquare,
  Smartphone,
  Settings,
  LayoutDashboard,
  Bot,
  BarChart3,
  FileText,
  MessageCircle,
  Shield,
  Activity,
  UserPlus,
  Clock,
  PieChart,
  Upload,
  Crown,
  LogOut,
  AlertTriangle,
  Headphones,
} from "lucide-react";

const SUPPORT_PHONE = "573202101789";
const SUPPORT_MESSAGE = "Hola, necesito ayuda con mi cuenta de WhatSenvia";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, feature: null },
  { name: "Bot Builder", href: "/bot-builder", icon: Bot, feature: "botBuilder" },
  { name: "Chat Live", href: "/chat-live", icon: MessageCircle, feature: "chatLive" },
  { name: "Envio Masivo", href: "/campaigns", icon: Send, feature: "campaigns" },
  { name: "Control", href: "/campaign-control", icon: Shield, feature: "campaignControl" },
  { name: "Monitor", href: "/campaign-monitor", icon: Activity, feature: null },
  { name: "Programados", href: "/scheduled", icon: Clock, feature: "scheduledCampaigns" },
  { name: "Plantillas", href: "/templates", icon: FileText, feature: "templates" },
  { name: "Encuestas", href: "/poll-results", icon: BarChart3, feature: "polls" },
  { name: "Contactos", href: "/contacts", icon: Users, feature: null },
  { name: "Extraer Contactos", href: "/extract-contacts", icon: UserPlus, feature: "contactExtraction" },
  { name: "Importar", href: "/import", icon: Upload, feature: "import" },
  { name: "Mensajes", href: "/messages", icon: MessageSquare, feature: null },
  { name: "WhatsApp", href: "/whatsapp", icon: Smartphone, feature: null },
  { name: "Reportes", href: "/reports", icon: PieChart, feature: "reports" },
  { name: "Configuracion", href: "/settings", icon: Settings, feature: null },
];

function getLicenseStatus(user: any) {
  if (!user || user.role === "admin") return null;

  const license = user.license;
  if (!license) return { type: "none" as const, message: "Sin licencia activa" };
  if (license.status === "suspended") return { type: "suspended" as const, message: "Licencia suspendida" };
  if (license.status === "expired") return { type: "expired" as const, message: "Licencia expirada" };
  if (license.status === "cancelled") return { type: "expired" as const, message: "Licencia cancelada" };

  // Check if about to expire (3 days)
  if (license.expiresAt) {
    const daysLeft = Math.ceil((new Date(license.expiresAt).getTime() - Date.now()) / 86400000);
    if (daysLeft <= 0) return { type: "expired" as const, message: "Licencia expirada" };
    if (daysLeft <= 3) return { type: "warning" as const, message: `Tu licencia vence en ${daysLeft} dia${daysLeft > 1 ? "s" : ""}` };
  }

  return null;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasFeature, isAdmin } = useAuth();

  const visibleNav = navigation.filter(
    (item) => !item.feature || hasFeature(item.feature)
  );

  const licenseStatus = getLicenseStatus(user);

  const supportUrl = `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(SUPPORT_MESSAGE)}`;

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-whatsapp">
          <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </div>
        <span className="text-lg font-bold">WhatSenvia</span>
      </div>

      {/* License status banner */}
      {licenseStatus && (
        <div
          className={cn(
            "mx-4 mt-4 rounded-lg p-3 text-xs",
            licenseStatus.type === "warning"
              ? "bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400"
              : "bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400"
          )}
        >
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            {licenseStatus.message}
          </div>
          <a
            href={supportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "mt-2 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              licenseStatus.type === "warning"
                ? "bg-amber-200/50 hover:bg-amber-200 dark:bg-amber-800/30 dark:hover:bg-amber-800/50"
                : "bg-red-200/50 hover:bg-red-200 dark:bg-red-800/30 dark:hover:bg-red-800/50"
            )}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Contactar Soporte
          </a>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {visibleNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}

        {isAdmin() && (
          <>
            <div className="my-3 border-t" />
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Crown className="h-5 w-5" />
              Admin Panel
            </Link>
          </>
        )}
      </nav>

      {/* Support button - always visible */}
      <div className="px-4 pb-2">
        <a
          href={supportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg bg-whatsapp/10 px-3 py-2 text-sm font-medium text-green-700 hover:bg-whatsapp/20 transition-colors dark:text-green-400"
        >
          <Headphones className="h-4 w-4" />
          Soporte WhatsApp
        </a>
      </div>

      <div className="border-t p-4">
        <div className="flex items-center justify-between px-3">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || "Usuario"}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.license?.plan ? `Plan ${user.license.plan}` : user?.role === "admin" ? "Administrador" : "Sin licencia"}
            </p>
          </div>
          <button
            onClick={logout}
            className="text-muted-foreground hover:text-destructive transition-colors"
            title="Cerrar sesion"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
