"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  FileCheck,
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
  ChevronDown,
} from "lucide-react";

const SUPPORT_PHONE = "573202101789";
const SUPPORT_MESSAGE = "Hola, necesito ayuda con mi cuenta de ClickSend";

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

const navigation = [
  { nameKey: 'nav.dashboard', href: "/dashboard", icon: LayoutDashboard, feature: null },
  { nameKey: 'nav.connection', href: "/whatsapp", icon: Smartphone, feature: null },
  { nameKey: 'nav.botBuilder', href: "/bot-builder", icon: Bot, feature: "botBuilder" },
  { nameKey: 'nav.chatLive', href: "/chat-live", icon: MessageCircle, feature: "chatLive" },
  { nameKey: 'nav.bulkSend', href: "/campaigns", icon: Send, feature: "campaigns" },
  { nameKey: 'nav.control', href: "/campaign-control", icon: Shield, feature: "campaignControl" },
  { nameKey: 'nav.monitor', href: "/campaign-monitor", icon: Activity, feature: null },
  { nameKey: 'nav.scheduled', href: "/scheduled", icon: Clock, feature: "scheduledCampaigns" },
  { nameKey: 'nav.templates', href: "/templates", icon: FileText, feature: "templates" },
  { nameKey: 'nav.metaTemplates', href: "/meta-templates", icon: FileCheck, feature: null },
  { nameKey: 'nav.polls', href: "/poll-results", icon: BarChart3, feature: "polls" },
  { nameKey: 'nav.contacts', href: "/contacts", icon: Users, feature: null },
  { nameKey: 'nav.extractContacts', href: "/extract-contacts", icon: UserPlus, feature: "contactExtraction" },
  { nameKey: 'nav.import', href: "/import", icon: Upload, feature: "import" },
  { nameKey: 'nav.messages', href: "/messages", icon: MessageSquare, feature: null },
  { nameKey: 'nav.reports', href: "/reports", icon: PieChart, feature: "reports" },
  { nameKey: 'nav.testApiMeta', href: "/test-whatsapp", icon: Zap, feature: null },
  { nameKey: 'nav.settings', href: "/settings", icon: Settings, feature: null },
];

export function TopNav() {
  const pathname = usePathname();
  const { user, logout, hasFeature, isAdmin } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentLocale = mounted ? locale : 'es';

  const visibleNav = navigation.filter(
    (item) => !item.feature || hasFeature(item.feature)
  );

  const licenseStatus = getLicenseStatus(user, t);
  const supportUrl = `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(SUPPORT_MESSAGE)}`;

  return (
    <>
      {/* Desktop Top Navigation */}
      <header className="sticky top-0 z-40 bg-gray-50 dark:bg-gray-950">
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          {/* Left: Logo + Nav Items */}
          <div className="flex items-center gap-1 md:gap-1.5 overflow-x-auto">
            <div className="flex items-center gap-2 mr-3 shrink-0">
              <div className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center">
                <Clock className="h-3.5 w-3.5 text-white" strokeWidth={2} />
              </div>
              <span className="text-sm font-semibold tracking-[-0.02em] hidden sm:block">ClickSend</span>
            </div>
            {visibleNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium tracking-[-0.02em] transition-all duration-150 whitespace-nowrap shrink-0",
                    isActive
                      ? "text-primary"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  )}
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden lg:inline">{t(item.nameKey)}</span>
                </Link>
              );
            })}
            {isAdmin() && (
              <Link
                href="/admin"
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium tracking-[-0.02em] transition-all duration-150 whitespace-nowrap shrink-0",
                  pathname.startsWith("/admin")
                    ? "text-primary"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                )}
              >
                <Crown className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden lg:inline">{t('nav.adminPanel')}</span>
              </Link>
            )}
          </div>

          {/* Right: User info + actions */}
          <div className="flex items-center gap-2 shrink-0">
            {licenseStatus && (
              <div className="hidden md:flex items-center gap-1.5 text-xs font-medium tracking-normal text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-md">
                <AlertTriangle className="h-3 w-3" />
                <span className="hidden lg:inline">{licenseStatus.message}</span>
              </div>
            )}
            <a
              href={supportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium tracking-[-0.02em] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              title={t('nav.support')}
            >
              <Headphones className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">{t('nav.support')}</span>
            </a>
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium tracking-[-0.02em] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </div>
                <span className="hidden md:inline text-xs font-medium tracking-normal text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                  {user?.name || t('auth.user')}
                </span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] py-1 z-20">
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                      <p className="text-xs font-semibold tracking-[-0.02em] truncate">{user?.name || t('auth.user')}</p>
                      <p className="text-[10px] font-normal tracking-normal text-gray-400 truncate">
                        {user?.license?.plan ? `${t('license.plan')} ${user.license.plan}` : user?.role === "admin" ? t('license.admin') : t('license.noLicense')}
                      </p>
                    </div>
                    <div className="px-2 py-1">
                      <button
                        onClick={() => setLocale(currentLocale === 'es' ? 'en' : 'es')}
                        className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs font-medium tracking-normal text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Globe className="h-3 w-3" />
                        {currentLocale === 'es' ? 'English' : 'Español'}
                      </button>
                      <Link
                        href="/privacy-policy"
                        className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs font-medium tracking-normal text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        {t('nav.privacyPolicy')}
                      </Link>
                      <button
                        onClick={logout}
                        className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs font-medium tracking-normal text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <LogOut className="h-3 w-3" />
                        {t('auth.logout')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen nav overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-gray-50 dark:bg-gray-950 flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200/60 dark:border-gray-800/60">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center">
                  <Clock className="h-3.5 w-3.5 text-white" strokeWidth={2} />
                </div>
                <span className="text-sm font-semibold tracking-[-0.02em]">ClickSend</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {licenseStatus && (
              <div className={cn(
                "mx-3 mt-3 rounded-lg p-2.5 text-xs font-normal tracking-normal",
                licenseStatus.type === "warning"
                  ? "bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400"
                  : "bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400"
              )}>
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  {licenseStatus.message}
                </div>
              </div>
            )}

            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
              {visibleNav.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium tracking-[-0.02em] transition-all duration-150",
                      isActive
                        ? "bg-primary/5 text-primary"
                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-200"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {t(item.nameKey)}
                  </Link>
                );
              })}
              {isAdmin() && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium tracking-[-0.02em] transition-all duration-150",
                    pathname.startsWith("/admin")
                      ? "bg-primary/5 text-primary"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-200"
                  )}
                >
                  <Crown className="h-4 w-4 shrink-0" />
                  {t('nav.adminPanel')}
                </Link>
              )}
            </nav>

            <div className="px-3 pb-3 border-t border-gray-200/60 dark:border-gray-800/60 pt-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-[-0.02em] truncate">{user?.name || t('auth.user')}</p>
                  <p className="text-[10px] font-normal tracking-normal text-gray-400 truncate">
                    {user?.license?.plan ? `${t('license.plan')} ${user.license.plan}` : user?.role === "admin" ? t('license.admin') : t('license.noLicense')}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  title={t('auth.logout')}
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

// Keep Sidebar export for backward compatibility - it's now a top nav
export { TopNav as Sidebar };

export function MobileHeader() {
  return null;
}
