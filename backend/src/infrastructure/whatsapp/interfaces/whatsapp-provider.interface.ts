export interface SendMessageOptions {
  phone: string;
  message: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio" | "document";
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IncomingMessage {
  from: string; // phone number (without @s.whatsapp.net)
  remoteJid: string; // raw JID for replying (e.g. "573xxx@s.whatsapp.net" or "xxx@lid")
  message: string;
  messageId: string;
  isGroup: boolean;
  pushName?: string; // contact name from WhatsApp
}

export interface PollVote {
  from: string; // phone number of voter
  pollMessageId: string; // messageId of the original poll
  pollName: string; // question text
  selectedOptions: string[]; // option names the user selected
}

export interface WhatsAppConnectionEvents {
  onQR: (qr: string) => void;
  onConnected: (phone: string) => void;
  onDisconnected: (reason: string) => void;
  onMessageStatus: (messageId: string, status: string) => void;
  onMessage?: (message: IncomingMessage) => void;
  onPollResponse?: (vote: PollVote) => void;
  onContactsSync?: (contacts: Array<{ jid: string; name: string; notify?: string }>) => void;
}

export interface IWhatsAppProvider {
  readonly providerName: string;

  connect(sessionId: string, events: WhatsAppConnectionEvents): Promise<void>;
  disconnect(sessionId: string): Promise<void>;
  isConnected(sessionId: string): boolean;

  sendMessage(sessionId: string, options: SendMessageOptions): Promise<SendMessageResult>;

  sendPoll(sessionId: string, phone: string, pollName: string, options: string[], selectableCount?: number): Promise<string>;

  getSessionInfo(sessionId: string): { phone?: string; status: string } | null;

  getGroups(sessionId: string): Promise<Array<{ id: string; subject: string; participantsCount: number }>>;
  getGroupParticipants(sessionId: string, groupId: string): Promise<Array<{ phone: string; isAdmin: boolean }>>;
  checkNumberExists(sessionId: string, phone: string): Promise<{ exists: boolean; jid?: string }>;

  sendPresenceUpdate(sessionId: string, type: "composing" | "paused", jid: string): Promise<void>;
}
