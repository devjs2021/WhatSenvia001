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

export const dashboardNavGroups: DashboardNavGroup[] = [
  {
    nameKey: "nav.dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    children: [
      { nameKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard, feature: null },
    ],
  },
  {
    nameKey: "nav.messaging",
    icon: Send,
    href: "/campaigns",
    children: [
      { nameKey: "nav.bulkSend", href: "/campaigns", icon: Send, feature: "campaigns" },
      { nameKey: "nav.connection", href: "/whatsapp", icon: Smartphone, feature: null },
      { nameKey: "nav.botBuilder", href: "/bot-builder", icon: Bot, feature: "botBuilder" },
      { nameKey: "nav.chatLive", href: "/chat-live", icon: MessageCircle, feature: "chatLive" },
    ],
  },
  {
    nameKey: "nav.contactsGroup",
    icon: Users,
    href: "/contacts",
    children: [
      { nameKey: "nav.contacts", href: "/contacts", icon: Users, feature: null },
      { nameKey: "nav.import", href: "/import", icon: Upload, feature: "import" },
      { nameKey: "nav.extractContacts", href: "/extract-contacts", icon: UserPlus, feature: "contactExtraction" },
    ],
  },
  {
    nameKey: "nav.campaigns",
    icon: Send,
    href: "/campaigns",
    children: [
      { nameKey: "nav.campaigns", href: "/campaigns", icon: Send, feature: "campaigns" },
    ],
  },
  {
    nameKey: "nav.analytics",
    icon: BarChart3,
    href: "/poll-results",
    children: [
      { nameKey: "nav.polls", href: "/poll-results", icon: BarChart3, feature: "polls" },
    ],
  },
  {
    nameKey: "nav.settings",
    icon: Settings,
    href: "/settings",
    children: [
      { nameKey: "nav.settings", href: "/settings", icon: Crown, feature: null },
    ],
  },
];

export function findGroupByHref(pathname: string): DashboardNavGroup | undefined {
  return dashboardNavGroups.find((group) =>
    group.children.some((child) => pathname === child.href || pathname.startsWith(child.href + "/"))
  );
}
