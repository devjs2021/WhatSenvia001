import {
  LayoutDashboard,
  Smartphone,
  Bot,
  MessageCircle,
  Send,
  Shield,
  Activity,
  Clock,
  FileText,
  FileCheck,
  BarChart3,
  Users,
  UserPlus,
  Upload,
  MessageSquare,
  PieChart,
  Zap,
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

export const dashboardNavigation: DashboardNavItem[] = [
  { nameKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard, feature: null },
  { nameKey: "nav.connection", href: "/whatsapp", icon: Smartphone, feature: null },
  { nameKey: "nav.botBuilder", href: "/bot-builder", icon: Bot, feature: "botBuilder" },
  { nameKey: "nav.chatLive", href: "/chat-live", icon: MessageCircle, feature: "chatLive" },
  { nameKey: "nav.bulkSend", href: "/campaigns", icon: Send, feature: "campaigns" },
  { nameKey: "nav.control", href: "/campaign-control", icon: Shield, feature: "campaignControl" },
  { nameKey: "nav.monitor", href: "/campaign-monitor", icon: Activity, feature: null },
  { nameKey: "nav.scheduled", href: "/scheduled", icon: Clock, feature: "scheduledCampaigns" },
  { nameKey: "nav.templates", href: "/templates", icon: FileText, feature: "templates" },
  { nameKey: "nav.metaTemplates", href: "/meta-templates", icon: FileCheck, feature: null },
  { nameKey: "nav.polls", href: "/poll-results", icon: BarChart3, feature: "polls" },
  { nameKey: "nav.contacts", href: "/contacts", icon: Users, feature: null },
  { nameKey: "nav.extractContacts", href: "/extract-contacts", icon: UserPlus, feature: "contactExtraction" },
  { nameKey: "nav.import", href: "/import", icon: Upload, feature: "import" },
  { nameKey: "nav.messages", href: "/messages", icon: MessageSquare, feature: null },
  { nameKey: "nav.reports", href: "/reports", icon: PieChart, feature: "reports" },
  { nameKey: "nav.testApiMeta", href: "/test-whatsapp", icon: Zap, feature: null },
  { nameKey: "nav.settings", href: "/settings", icon: Settings, feature: null },
];

export const adminNavItem: DashboardNavItem = {
  nameKey: "nav.adminPanel",
  href: "/admin",
  icon: Crown,
  feature: null,
};
