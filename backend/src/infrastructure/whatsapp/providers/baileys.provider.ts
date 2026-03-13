import type {
  IWhatsAppProvider,
  SendMessageOptions,
  SendMessageResult,
  WhatsAppConnectionEvents,
} from "../interfaces/whatsapp-provider.interface.js";
import pino from "pino";
const logger = pino({ level: "silent" });
import { env } from "../../../config/env.js";
// @ts-expect-error - baileys v7 is ESM but tsx handles it fine at runtime
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, decryptPollVote, makeCacheableSignalKeyStore, jidNormalizedUser, getAggregateVotesInPollMessage } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import path from "path";
import fs from "fs";

interface SessionState {
  socket: ReturnType<typeof makeWASocket> | null;
  phone?: string;
  status: "disconnected" | "connecting" | "connected" | "qr_pending";
}

export class BaileysProvider implements IWhatsAppProvider {
  readonly providerName = "baileys";
  private sessions = new Map<string, SessionState>();
  // Cache for poll creation messages (needed for vote decryption)
  private pollMessageCache = new Map<string, any>();
  // In-memory message store for getMessage callback
  private messageStore = new Map<string, any>();

  constructor() {
    // Clean up old messages every 10 minutes (keep last 500)
    setInterval(() => {
      if (this.messageStore.size > 500) {
        const keys = [...this.messageStore.keys()];
        const toDelete = keys.slice(0, keys.length - 500);
        for (const key of toDelete) this.messageStore.delete(key);
      }
    }, 10 * 60 * 1000);
  }

  async connect(sessionId: string, events: WhatsAppConnectionEvents): Promise<void> {
    const sessionPath = path.join(env.WHATSAPP_SESSION_PATH, sessionId);

    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const socket = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger.child({ module: "baileys" }) as any),
      },
      printQRInTerminal: false,
      logger: logger.child({ module: "baileys" }) as any,
      browser: ["WhatSenvia", "Chrome", "1.0.0"],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 25000,
      markOnlineOnConnect: false,
      // Required for poll vote decryption — Baileys asks for original message on retry
      getMessage: async (key: any) => {
        const cached = this.pollMessageCache.get(key.id);
        if (cached) {
          console.log(`[POLL] getMessage: found cached poll for ${key.id}`);
          return cached;
        }
        const stored = this.messageStore.get(key.id);
        if (stored?.message) return stored.message;
        // Return empty message (not undefined) — matches desktop app behavior
        return { conversation: "" };
      },
    });

    this.sessions.set(sessionId, { socket, status: "connecting" });

    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.updateSession(sessionId, { status: "qr_pending" });
        events.onQR(qr);
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        this.updateSession(sessionId, { status: "disconnected" });
        events.onDisconnected(lastDisconnect?.error?.message || "Unknown reason");

        if (shouldReconnect) {
          setTimeout(() => this.connect(sessionId, events), 5000);
        } else {
          this.cleanupSession(sessionId);
        }
      }

      if (connection === "open") {
        const phone = socket.user?.id?.split(":")[0] || "";
        this.updateSession(sessionId, { status: "connected", phone });
        events.onConnected(phone);
      }
    });

    // Cache outgoing poll messages for vote decryption
    socket.ev.on("messages.upsert", ({ messages: msgs }) => {
      for (const msg of msgs) {
        if (msg.key.id && msg.message) {
          this.messageStore.set(msg.key.id, msg);
          // Auto-cache outgoing polls
          if (msg.message.pollCreationMessage || msg.message.pollCreationMessageV2 || msg.message.pollCreationMessageV3) {
            console.log(`[POLL] Caching poll message: ${msg.key.id}`);
            this.pollMessageCache.set(msg.key.id, msg.message);
          }
        }
      }
    });

    // Incoming messages handler
    socket.ev.on("messages.upsert", ({ messages: msgs, type }) => {
      if (type !== "notify") return;

      for (const msg of msgs) {
        if (msg.key.fromMe) continue;

        // Handle poll vote updates
        if (msg.message?.pollUpdateMessage && events.onPollResponse) {
          this.handlePollVote(socket, msg, events);
          continue;
        }

        // Handle text messages
        if (!msg.message) continue;
        const jid = msg.key.remoteJid || "";
        if (!jid || jid === "status@broadcast") continue;
        const isGroup = jid.endsWith("@g.us");
        const from = jid.replace("@s.whatsapp.net", "").replace("@g.us", "");

        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.buttonsResponseMessage?.selectedDisplayText ||
          msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
          "";

        if (text && events.onMessage) {
          const cleanFrom = from.replace("@lid", "");
          events.onMessage({
            from: cleanFrom,
            remoteJid: jid,
            message: text,
            messageId: msg.key.id || "",
            isGroup,
            pushName: msg.pushName || undefined,
          });
        }
      }
    });

    // Poll updates via messages.update (alternative path for poll votes)
    socket.ev.on("messages.update", (updates) => {
      for (const { key, update } of updates) {
        // Status updates
        if (update.status) {
          const statusMap: Record<number, string> = {
            2: "sent",
            3: "delivered",
            4: "read",
          };
          const status = statusMap[update.status] || "unknown";
          events.onMessageStatus(key.id!, status);
        }

        // Poll vote aggregation via messages.update
        if ((update as any).pollUpdates && events.onPollResponse) {
          const pollCreation = this.pollMessageCache.get(key.id!);
          if (!pollCreation) continue;

          for (const pollUpdate of (update as any).pollUpdates) {
            try {
              const votes = getAggregateVotesInPollMessage({
                message: pollCreation,
                pollUpdates: [pollUpdate],
              });

              const selectedOptions = votes
                .filter((v: any) => v.voters && v.voters.length > 0)
                .map((v: any) => v.name);

              if (selectedOptions.length > 0) {
                const voterJid = pollUpdate.pollUpdateMessageKey?.participant || key.remoteJid || "";
                const voterPhone = voterJid.replace("@s.whatsapp.net", "").replace("@lid", "");

                console.log(`[POLL] Vote via messages.update from ${voterPhone}: ${selectedOptions.join(", ")}`);
                events.onPollResponse({
                  from: voterPhone,
                  pollMessageId: key.id!,
                  pollName: pollCreation.pollCreationMessage?.name
                    || pollCreation.pollCreationMessageV2?.name
                    || pollCreation.pollCreationMessageV3?.name
                    || "",
                  selectedOptions,
                });
              }
            } catch (err: any) {
              console.error(`[POLL] Error processing poll update:`, err.message);
            }
          }
        }
      }
    });

    // Sync contacts
    socket.ev.on("contacts.upsert", (contacts) => {
      const synced = contacts
        .filter((c: any) => c.id?.endsWith("@s.whatsapp.net"))
        .map((c: any) => ({
          jid: c.id,
          name: c.name || c.notify || c.verifiedName || "",
          notify: c.notify || "",
        }));
      if (synced.length > 0) {
        events.onContactsSync?.(synced);
      }
    });

    socket.ev.on("contacts.update", (updates) => {
      const synced = updates
        .filter((c: any) => c.id?.endsWith("@s.whatsapp.net"))
        .map((c: any) => ({
          jid: c.id,
          name: c.name || c.notify || c.verifiedName || "",
          notify: c.notify || "",
        }));
      if (synced.length > 0) {
        events.onContactsSync?.(synced);
      }
    });

    socket.ev.on("messaging-history.set", ({ contacts: syncedContacts }: any) => {
      if (syncedContacts?.length > 0) {
        const synced = syncedContacts
          .filter((c: any) => c.id?.endsWith("@s.whatsapp.net"))
          .map((c: any) => ({
            jid: c.id,
            name: c.name || c.notify || c.verifiedName || "",
            notify: c.notify || "",
          }));
        if (synced.length > 0) {
          events.onContactsSync?.(synced);
        }
      }
    });
  }

  /**
   * Handle poll vote decryption — replicates the desktop app logic with LID/PN JID combinations.
   */
  private handlePollVote(socket: ReturnType<typeof makeWASocket>, msg: any, events: WhatsAppConnectionEvents) {
    try {
      const pollUpdateMsg = msg.message.pollUpdateMessage;
      const creationMsgKey = pollUpdateMsg.pollCreationMessageKey;
      const pollMsgId = creationMsgKey?.id || "";

      // Get cached poll message
      const pollMsg = this.pollMessageCache.get(pollMsgId);
      if (!pollMsg) {
        console.warn(`[POLL] No cached poll message for: ${pollMsgId}`);
        return;
      }

      const pollEncKey = pollMsg.messageContextInfo?.messageSecret;
      if (!pollEncKey) {
        console.warn(`[POLL] No messageSecret in cached poll message: ${pollMsgId}`);
        return;
      }

      // Build JID combinations (LID + PN formats) — same as desktop app
      const meIdPN = jidNormalizedUser(socket.user?.id);
      const meIdLID = (socket.user as any)?.lid ? jidNormalizedUser((socket.user as any).lid) : null;

      const isLidAddressing = msg.key.remoteJid?.endsWith("@lid");
      const voterLID = isLidAddressing ? msg.key.remoteJid : null;
      const voterPN = isLidAddressing
        ? ((msg.key as any).remoteJidAlt || msg.key.remoteJid)
        : msg.key.remoteJid;

      const jidCombinations: { pollCreatorJid: string; voterJid: string; label: string }[] = [];
      if (voterLID && meIdLID) {
        jidCombinations.push({ pollCreatorJid: meIdLID, voterJid: voterLID, label: "LID+LID" });
      }
      if (voterLID) {
        jidCombinations.push({ pollCreatorJid: meIdPN, voterJid: voterLID, label: "PN+LID" });
      }
      if (meIdLID) {
        jidCombinations.push({ pollCreatorJid: meIdLID, voterJid: voterPN, label: "LID+PN" });
      }
      jidCombinations.push({ pollCreatorJid: meIdPN, voterJid: voterPN, label: "PN+PN" });

      let voteMsg: any = null;
      for (const combo of jidCombinations) {
        try {
          voteMsg = decryptPollVote(
            pollUpdateMsg.vote,
            {
              pollEncKey,
              pollCreatorJid: combo.pollCreatorJid,
              pollMsgId: pollMsgId,
              voterJid: combo.voterJid,
            },
          );
          console.log(`[POLL] Vote decrypted (${combo.label}) for poll: ${pollMsgId}`);
          break;
        } catch {
          // Try next combination
        }
      }

      if (!voteMsg) {
        console.error(`[POLL] Failed to decrypt vote — tried ${jidCombinations.length} JID combos for pollMsgId=${pollMsgId}`);
        return;
      }

      // Use getAggregateVotesInPollMessage to match hashes to option names
      const pollUpdate = {
        pollUpdateMessageKey: msg.key,
        vote: voteMsg,
        senderTimestampMs: typeof pollUpdateMsg.senderTimestampMs?.toNumber === "function"
          ? pollUpdateMsg.senderTimestampMs.toNumber()
          : Number(pollUpdateMsg.senderTimestampMs),
      };

      const votes = getAggregateVotesInPollMessage({
        message: pollMsg,
        pollUpdates: [pollUpdate],
      });

      const selectedOptions = votes
        .filter((v: any) => v.voters && v.voters.length > 0)
        .map((v: any) => v.name);

      const voterPhone = (voterPN || msg.key.remoteJid || "")
        .replace("@s.whatsapp.net", "")
        .replace("@lid", "");
      const pollName = pollMsg.pollCreationMessage?.name
        || pollMsg.pollCreationMessageV2?.name
        || pollMsg.pollCreationMessageV3?.name
        || "";

      console.log(`[POLL] Vote from ${voterPhone}: ${selectedOptions.join(", ")} (poll: "${pollName}")`);

      if (selectedOptions.length > 0 && events.onPollResponse) {
        events.onPollResponse({
          from: voterPhone,
          pollMessageId: pollMsgId,
          pollName,
          selectedOptions,
        });
      }
    } catch (err: any) {
      console.error(`[POLL] Error processing poll vote:`, err.message);
    }
  }

  async sendPresenceUpdate(sessionId: string, type: "composing" | "paused", jid: string) {
    const session = this.sessions.get(sessionId);
    if (!session?.socket) return;
    try {
      await session.socket.sendPresenceUpdate(type, jid);
    } catch {}
  }

  async disconnect(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session?.socket) {
      await session.socket.logout();
      this.cleanupSession(sessionId);
    }
  }

  isConnected(sessionId: string): boolean {
    return this.sessions.get(sessionId)?.status === "connected";
  }

  async sendMessage(sessionId: string, options: SendMessageOptions): Promise<SendMessageResult> {
    const session = this.sessions.get(sessionId);

    if (!session?.socket || session.status !== "connected") {
      return { success: false, error: "Session not connected" };
    }

    try {
      const jid = this.formatJid(options.phone);

      // Human-like delay (anti-ban)
      const delay = env.WHATSAPP_MESSAGE_DELAY_MS + Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Simulate typing
      await session.socket.presenceSubscribe(jid);
      await session.socket.sendPresenceUpdate("composing", jid);
      await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));
      await session.socket.sendPresenceUpdate("paused", jid);

      let result;

      if (options.mediaUrl && options.mediaType) {
        const mediaContent = this.buildMediaMessage(options);
        result = await session.socket.sendMessage(jid, mediaContent as any);
      } else {
        result = await session.socket.sendMessage(jid, { text: options.message });
      }

      return {
        success: true,
        messageId: result?.key?.id || undefined,
      };
    } catch (error: any) {
      logger.error({ sessionId, phone: options.phone, error: error.message }, "Failed to send message");
      return { success: false, error: error.message };
    }
  }

  async sendPoll(sessionId: string, phone: string, pollName: string, options: string[], selectableCount: number = 1): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== "connected" || !session.socket) {
      throw new Error("Session not connected");
    }

    const jid = this.formatJid(phone);

    const msg = await session.socket.sendMessage(jid, {
      poll: {
        name: pollName,
        values: options,
        selectableCount,
      },
    });

    // Cache the poll message for vote decryption
    if (msg?.key?.id && msg.message) {
      console.log(`[POLL] Caching sent poll: ${msg.key.id}`);
      this.pollMessageCache.set(msg.key.id, msg.message);
      this.messageStore.set(msg.key.id, msg);
    }

    return msg?.key?.id || "";
  }

  getSessionInfo(sessionId: string): { phone?: string; status: string } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return { phone: session.phone, status: session.status };
  }

  async getGroups(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session?.socket) throw new Error("Session not connected");
    const groups = await session.socket.groupFetchAllParticipating();
    return Object.values(groups).map((g: any) => ({
      id: g.id,
      subject: g.subject || "Sin nombre",
      participantsCount: (g.participants || []).length,
    }));
  }

  async getGroupParticipants(sessionId: string, groupId: string) {
    const session = this.sessions.get(sessionId);
    if (!session?.socket) throw new Error("Session not connected");
    const metadata = await session.socket.groupMetadata(groupId);
    return (metadata.participants || [])
      .filter((p: any) => p.id.endsWith("@s.whatsapp.net"))
      .map((p: any) => ({
        phone: p.id.replace("@s.whatsapp.net", ""),
        isAdmin: p.admin === "admin" || p.admin === "superadmin",
      }));
  }

  async checkNumberExists(sessionId: string, phone: string) {
    const session = this.sessions.get(sessionId);
    if (!session?.socket) throw new Error("Session not connected");
    const clean = phone.replace(/\D/g, "");
    const jid = `${clean}@s.whatsapp.net`;
    const results = await session.socket.onWhatsApp(jid);
    const result = results?.[0];
    return { exists: !!(result?.exists), jid: result?.jid };
  }

  private formatJid(phone: string): string {
    if (phone.includes("@")) return phone;
    const cleaned = phone.replace(/[^0-9]/g, "");
    return `${cleaned}@s.whatsapp.net`;
  }

  private buildMediaMessage(options: SendMessageOptions): Record<string, any> {
    const base = { caption: options.message };

    switch (options.mediaType) {
      case "image":
        return { ...base, image: { url: options.mediaUrl! } };
      case "video":
        return { ...base, video: { url: options.mediaUrl! } };
      case "audio":
        return { audio: { url: options.mediaUrl! }, mimetype: "audio/mpeg" };
      case "document":
        return { ...base, document: { url: options.mediaUrl! } };
      default:
        return { text: options.message };
    }
  }

  private updateSession(sessionId: string, updates: Partial<SessionState>) {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
    }
  }

  private cleanupSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session?.socket) {
      session.socket.ev.removeAllListeners("creds.update");
      session.socket.ev.removeAllListeners("connection.update");
      session.socket.ev.removeAllListeners("messages.upsert");
      session.socket.ev.removeAllListeners("messages.update");
    }
    this.sessions.delete(sessionId);
  }
}
