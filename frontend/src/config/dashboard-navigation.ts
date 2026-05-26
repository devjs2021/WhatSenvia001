import {
  LayoutDashboard,
  Send,
  Smartphone,
  Bot,
  MessageCircle,
  Users,
  Upload,
  UserPlus,
  BarChart3,
  Settings,
  Crown,
  FileText,
  FileCheck,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

export interface DashboardNavItem {
  nameKey: string;
  href: string;
  icon: LucideIcon;
  feature: string | null;
  badge?: string;
}

export interface DashboardNavGroup {
  nameKey: string;
  icon: LucideIcon;
  href: string;
  children: DashboardNavItem[];
}

export type NavEntry = DashboardNavGroup;

export const dashboardNavGroups: NavEntry[] = [
  {
    nameKey: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    children: [
      { nameKey: "Dashboard", href: "/dashboard", icon: LayoutDashboard, feature: null },
    ],
  },
  {
    nameKey: "Messaging",
    icon: Send,
    href: "/campaigns",
    children: [
      { nameKey: "Bulk Send", href: "/campaigns", icon: Send, feature: "campaigns" },
      { nameKey: "Connection", href: "/whatsapp", icon: Smartphone, feature: null },
      { nameKey: "Bot Builder", href: "/bot-builder", icon: Bot, feature: "botBuilder" },
      { nameKey: "Chat Live", href: "/chat-live", icon: MessageCircle, feature: "chatLive" },
    ],
  },
  {
    nameKey: "Contacts",
    icon: Users,
    href: "/contacts",
    children: [
      { nameKey: "Contacts", href: "/contacts", icon: Users, feature: null },
      { nameKey: "Import", href: "/import", icon: Upload, feature: "import" },
      { nameKey: "Extract", href: "/extract-contacts", icon: UserPlus, feature: "contactExtraction" },
    ],
  },
  {
    nameKey: "Campaigns",
    icon: Send,
    href: "/campaigns",
    children: [
      { nameKey: "Campaigns", href: "/campaigns", icon: Send, feature: "campaigns" },
    ],
  },
  {
    nameKey: "Analytics",
    icon: BarChart3,
    href: "/poll-results",
    children: [
      { nameKey: "Polls", href: "/poll-results", icon: BarChart3, feature: "polls" },
    ],
  },
  {
    nameKey: "Settings",
    icon: Settings,
    href: "/settings",
    children: [
      { nameKey: "Settings", href: "/settings", icon: Crown, feature: null },
      { nameKey: "Templates", href: "/templates", icon: FileText, feature: "templates" },
      { nameKey: "Meta Templates", href: "/meta-templates", icon: FileCheck, feature: null },
    ],
  },
];

/** Encuentra a qué grupo pertenece una ruta */
export function findGroupByHref(pathname: string): DashboardNavGroup | undefined {
  return dashboardNavGroups.find((group) =>
    group.children.some((child) => pathname === child.href || pathname.startsWith(child.href + "/"))
  );
}
