export interface LicenseFeatures {
  campaigns: boolean;
  botBuilder: boolean;
  chatLive: boolean;
  polls: boolean;
  scheduledCampaigns: boolean;
  contactExtraction: boolean;
  import: boolean;
  reports: boolean;
  templates: boolean;
  campaignControl: boolean;
}

export interface License {
  id: string;
  plan: string;
  status: string;
  expiresAt?: string | null;
  features: LicenseFeatures;
  maxSessions?: number;
  maxContacts?: number;
  maxMessagesPerDay?: number;
  maxCampaignsPerDay?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  company?: string;
  role: string; // "admin" | "user"
  createdAt: string;
  license?: License | null;
}

export interface Contact {
  id: string;
  userId: string;
  phone: string;
  name?: string;
  email?: string;
  tags: string[];
  metadata: Record<string, string>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  userId: string;
  sessionId?: string;
  name: string;
  description?: string;
  message: string;
  mediaUrl?: string;
  mediaType?: string;
  status: "draft" | "scheduled" | "running" | "paused" | "completed" | "failed";
  targetTags: string[];
  totalContacts: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  messagesPerMinute: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  userId: string;
  contactId: string;
  campaignId?: string;
  phone: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  status: "queued" | "sending" | "sent" | "delivered" | "read" | "failed";
  whatsappMessageId?: string;
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
}

export interface WhatsAppSession {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  status: "disconnected" | "connecting" | "connected" | "qr_pending";
  isDefault: boolean;
  qrCode?: string;
  lastConnectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface BotFlow {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status: "active" | "inactive" | "draft";
  isTemplate: boolean;
  sessionId?: string;
  nodes: any[];
  edges: any[];
  createdAt: string;
  updatedAt: string;
}

export interface BotSettings {
  id: string;
  userId: string;
  mode: "ia_complete" | "hybrid" | "traditional";
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BotAiConfig {
  id: string;
  userId: string;
  provider: string;
  model: string;
  apiKey?: string;
  systemPrompt?: string;
  businessInfo?: string;
  faqs?: string;
  welcomeMessage?: string;
  temperature?: string;
  maxTokens?: string;
  activationKeywords?: string;
  supportNumber?: string;
  ragFiles: { name: string; content: string }[];
  ragEnabled: boolean;
  botActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PollCampaign {
  id: string;
  userId: string;
  sessionId?: string;
  question: string;
  options: string[];
  multiSelect: boolean;
  totalSent: number;
  totalResponses: number;
  createdAt: string;
}

export interface PollResponse {
  id: string;
  pollCampaignId: string;
  phone: string;
  selectedOptions: string[];
  whatsappMessageId?: string;
  respondedAt: string;
}

export interface PollResults extends PollCampaign {
  responses: PollResponse[];
  optionCounts: Record<string, number>;
  optionPhones: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
