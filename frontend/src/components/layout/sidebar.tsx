"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
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
  Menu,
  X,
  Zap,
  Globe,
} from "lucide-react";

const SUPPORT_PHONE = "573202101789";
const SUPPORT_MESSAGE = "Hola, necesito ayuda con mi cuenta de CallMesd";

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

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout, hasFeature, isAdmin } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentLocale = mounted ? locale : 'es';

  const navigation = [
    { name: t('nav.dashboard'), href: "/dashboard", icon: LayoutDashboard, feature: null },
    { name: t('nav.connection'), href: "/whatsapp", icon: Smartphone, feature: null },
    { name: t('nav.botBuilder'), href: "/bot-builder", icon: Bot, feature: "botBuilder" },
    { name: t('nav.chatLive'), href: "/chat-live", icon: MessageCircle, feature: "chatLive" },
    { name: t('nav.bulkSend'), href: "/campaigns", icon: Send, feature: "campaigns" },
    { name: t('nav.control'), href: "/campaign-control", icon: Shield, feature: "campaignControl" },
    { name: t('nav.monitor'), href: "/campaign-monitor", icon: Activity, feature: null },
    { name: t('nav.scheduled'), href: "/scheduled", icon: Clock, feature: "scheduledCampaigns" },
    { name: t('nav.templates'), href: "/templates", icon: FileText, feature: "templates" },
    { name: t('nav.polls'), href: "/poll-results", icon: BarChart3, feature: "polls" },
    { name: t('nav.contacts'), href: "/contacts", icon: Users, feature: null },
    { name: t('nav.extractContacts'), href: "/extract-contacts", icon: UserPlus, feature: "contactExtraction" },
    { name: t('nav.import'), href: "/import", icon: Upload, feature: "import" },
    { name: t('nav.messages'), href: "/messages", icon: MessageSquare, feature: null },
    { name: t('nav.reports'), href: "/reports", icon: PieChart, feature: "reports" },
    { name: t('nav.testApiMeta'), href: "/test-whatsapp", icon: Zap, feature: null },
    { name: t('nav.settings'), href: "/settings", icon: Settings, feature: null },
  ];

  const visibleNav = navigation.filter(
    (item) => !item.feature || hasFeature(item.feature)
  );

  const licenseStatus = getLicenseStatus(user, t);
  const supportUrl = `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(SUPPORT_MESSAGE)}`;

  return (
    <>
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Image src="/logo.png" alt="CallMesd" width={30} height={30} className="rounded-full" />
        <span className="text-sm font-bold tracking-tight">CallMesd</span>
      </div>

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
            {t('license.contactSupport')}
          </a>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {visibleNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              {item.name}
            </Link>
          );
        })}

        {isAdmin() && (
          <>
            <div className="my-2 border-t" />
            <Link
              href="/admin"
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Crown className="h-3.5 w-3.5 shrink-0" />
              {t('nav.adminPanel')}
            </Link>
          </>
        )}
      </nav>

      <div className="px-3 pb-2">
        <a
          href={supportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors dark:text-green-400"
        >
          <Headphones className="h-3.5 w-3.5" />
          {t('nav.support')}
        </a>
        <div className="mt-1 flex justify-center">
          <Link href="/privacy-policy" className="text-[10px] text-muted-foreground hover:text-primary transition-colors">
            {t('nav.privacyPolicy')}
          </Link>
        </div>
        <div className="mt-2 flex items-center justify-center gap-2">
          <Globe className="h-3 w-3 text-muted-foreground" />
          <button
            onClick={() => setLocale(currentLocale === 'es' ? 'en' : 'es')}
            className="text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            {currentLocale === 'es' ? 'English' : 'Español'}
          </button>
        </div>
      </div>

      <div className="border-t px-3 py-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{user?.name || t('auth.user')}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {user?.license?.plan ? `${t('license.plan')} ${user.license.plan}` : user?.role === "admin" ? t('license.admin') : t('license.noLicense')}
            </p>
          </div>
          <button
            onClick={logout}
            className="text-muted-foreground hover:text-destructive transition-colors p-1"
            title={t('auth.logout')}
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}

export function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between border-b bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="CallMesd" width={28} height={28} className="rounded-full" />
          <span className="text-sm font-bold tracking-tight">CallMesd</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-lg hover:bg-accent transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card flex flex-col shadow-xl animate-in slide-in-from-left duration-200">
            <div className="absolute right-2 top-2 z-10">
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex h-screen w-56 flex-col border-r bg-card">
      <SidebarContent />
    </aside>
  );
}
