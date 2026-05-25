import {
  LayoutDashboard,
  Send,
  Smartphone,
  Bot,
  MessageCircle,
  Zap,
  Users,
  Upload,
  UserPlus,
  List,
  BarChart3,
  Activity,
  PieChart,
  Settings,
  Crown,
  FileText,
  FileCheck,
  Shield,
  Clock,
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
  children: DashboardNavItem[];
}

export type NavEntry = DashboardNavGroup;

export const dashboardNavGroups: NavEntry[] = [
  {
    nameKey: "nav.dashboard",
    icon: LayoutDashboard,
    children: [
      { nameKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard, feature: null },
    ],
  },
  {
    nameKey: "navGroup.messaging",
    icon: Send,
    children: [
      { nameKey: "nav.bulkSend", href: "/campaigns", icon: Send, feature: "campaigns" },
      { nameKey: "nav.connection", href: "/whatsapp", icon: Smartphone, feature: null },
      { nameKey: "nav.botBuilder", href: "/bot-builder", icon: Bot, feature: "botBuilder" },
      { nameKey: "nav.chatLive", href: "/chat-live", icon: MessageCircle, feature: "chatLive" },
      { nameKey: "nav.testApiMeta", href: "/test-whatsapp", icon: Zap, feature: null },
    ],
  },
  {
    nameKey: "navGroup.contacts",
    icon: Users,
    children: [
      { nameKey: "nav.contacts", href: "/contacts", icon: Users, feature: null },
      { nameKey: "nav.import", href: "/import", icon: Upload, feature: "import" },
      { nameKey: "nav.extractContacts", href: "/extract-contacts", icon: UserPlus, feature: "contactExtraction" },
    ],
  },
  {
    nameKey: "navGroup.analytics",
    icon: BarChart3,
    children: [
      { nameKey: "nav.polls", href: "/poll-results", icon: BarChart3, feature: "polls" },
      { nameKey: "nav.monitor", href: "/campaign-monitor", icon: Activity, feature: null },
      { nameKey: "nav.reports", href: "/reports", icon: PieChart, feature: "reports" },
    ],
  },
  {
    nameKey: "navGroup.settings",
    icon: Settings,
    children: [
      { nameKey: "nav.templates", href: "/templates", icon: FileText, feature: "templates" },
      { nameKey: "nav.metaTemplates", href: "/meta-templates", icon: FileCheck, feature: null },
      { nameKey: "nav.control", href: "/campaign-control", icon: Shield, feature: "campaignControl" },
      { nameKey: "nav.scheduled", href: "/scheduled", icon: Clock, feature: "scheduledCampaigns" },
      { nameKey: "nav.messages", href: "/messages", icon: MessageSquare, feature: null },
      { nameKey: "nav.settings", href: "/settings", icon: Settings, feature: null },
    ],
  },
];

export const adminNavItem: DashboardNavItem = {
  nameKey: "nav.adminPanel",
  href: "/admin",
  icon: Crown,
  feature: null,
};
