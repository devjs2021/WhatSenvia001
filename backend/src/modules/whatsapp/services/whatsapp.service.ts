import { db } from "../../../config/database.js";
import { whatsappSessions } from "../../../infrastructure/database/schema/whatsapp-sessions.js";
import { campaigns } from "../../../infrastructure/database/schema/campaigns.js";
import { contacts } from "../../../infrastructure/database/schema/contacts.js";
import { eq } from "drizzle-orm";
import { getWhatsAppProvider } from "../../../infrastructure/whatsapp/whatsapp.factory.js";
import QRCode from "qrcode";
import { flowExecutor } from "../../bot-builder/services/flow-executor.service.js";
import { PollService } from "../../polls/services/poll.service.js";
import { chatService } from "../../chat/services/chat.service.js";
import { chatBroadcast } from "../../chat/websocket/chat-broadcast.js";

const pollService = new PollService();
const DEV_USER_ID = "00000000-0000-0000-0000-000000000000";

export class WhatsAppService {
  private provider = getWhatsAppProvider();

  // Auto-reconnect sessions that were "connected" before server restart
  async restoreSessions() {
    const sessions = await db
      .select()
      .from(whatsappSessions)
      .where(eq(whatsappSessions.status, "connected"));

    if (sessions.length === 0) {
      console.log("No WhatsApp sessions to restore");
      return;
    }

    console.log(`Restoring ${sessions.length} WhatsApp session(s)...`);

    for (const session of sessions) {
      try {
        await db
          .update(whatsappSessions)
          .set({ status: "connecting", updatedAt: new Date() })
          .where(eq(whatsappSessions.id, session.id));

        this.provider.connect(session.id, {
          onQR: async (qr) => {
            const qrDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
            await db
              .update(whatsappSessions)
              .set({ status: "qr_pending", qrCode: qrDataUrl, updatedAt: new Date() })
              .where(eq(whatsappSessions.id, session.id));
          },
          onConnected: async (phone) => {
            await db
              .update(whatsappSessions)
              .set({ status: "connected", phone, qrCode: null, lastConnectedAt: new Date(), updatedAt: new Date() })
              .where(eq(whatsappSessions.id, session.id));
            console.log(`Session "${session.name}" restored (${phone})`);
          },
          onDisconnected: async (reason) => {
            console.warn(`Session "${session.name}" disconnected during restore: ${reason}`);
            await db
              .update(whatsappSessions)
              .set({ status: "disconnected", updatedAt: new Date() })
              .where(eq(whatsappSessions.id, session.id));
          },
          onMessageStatus: async () => {},
          onMessage: async (msg) => {
            // Save incoming message to chat and broadcast
            try {
              const chatMsg = await chatService.saveMessage({
                sessionId: session.id,
                phone: msg.from,
                remoteJid: msg.remoteJid,
                content: msg.message,
                direction: "incoming",
                senderType: "user",
                whatsappMessageId: msg.messageId,
                pushName: msg.pushName,
              });
              chatBroadcast.broadcast(session.id, "new_message", chatMsg);
            } catch (chatErr: any) {
              console.error("Chat save error:", chatErr.message);
            }

            try {
              await flowExecutor.handleIncomingMessage(session.id, msg);
            } catch (err: any) {
              console.error(`Bot flow error (session ${session.name}):`, err.message);
            }
          },
          onPollResponse: async (vote) => {
            try {
              // Match by msgId first, then fallback to question text
              const campaign = await pollService.findCampaignByMessageId(vote.pollMessageId)
                || await pollService.findCampaignByQuestion(DEV_USER_ID, vote.pollName);
              if (campaign) {
                await pollService.recordResponse({
                  pollCampaignId: campaign.id,
                  phone: vote.from,
                  selectedOptions: vote.selectedOptions,
                  whatsappMessageId: vote.pollMessageId,
                });
                console.log(`[POLL] Vote recorded from ${vote.from}: ${vote.selectedOptions.join(", ")}`);
              } else {
                console.warn(`[POLL] No campaign found for poll "${vote.pollName}" (msgId: ${vote.pollMessageId})`);
              }
            } catch (err: any) {
              console.error(`Poll vote error (session ${session.name}):`, err.message);
            }
          },
          onContactsSync: async (syncedContacts) => {
            for (const c of syncedContacts) {
              const phone = c.jid.replace("@s.whatsapp.net", "");
              try {
                // Upsert into contacts table
                const existing = await db.select().from(contacts).where(eq(contacts.phone, phone)).limit(1);
                if (existing.length === 0) {
                  await db.insert(contacts).values({
                    userId: DEV_USER_ID,
                    phone,
                    name: c.name || c.notify || "",
                  });
                } else if (c.name && !existing[0].name) {
                  await db.update(contacts).set({ name: c.name }).where(eq(contacts.id, existing[0].id));
                }
              } catch {}
            }
          },
        });
      } catch (err: any) {
        console.error(`Failed to restore session "${session.name}": ${err.message}`);
        await db
          .update(whatsappSessions)
          .set({ status: "disconnected", updatedAt: new Date() })
          .where(eq(whatsappSessions.id, session.id));
      }
    }
  }

  async listSessions() {
    return db.select().from(whatsappSessions);
  }

  async createSession(userId: string, name: string) {
    const [session] = await db
      .insert(whatsappSessions)
      .values({ userId, name, status: "disconnected" })
      .returning();

    return session;
  }

  async connectSession(sessionId: string): Promise<{ qrDataUrl?: string }> {
    const [session] = await db
      .select()
      .from(whatsappSessions)
      .where(eq(whatsappSessions.id, sessionId))
      .limit(1);

    if (!session) throw new Error("Session not found");

    return new Promise((resolve) => {
      let resolved = false;

      this.provider.connect(sessionId, {
        onQR: async (qr) => {
          const qrDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });

          await db
            .update(whatsappSessions)
            .set({ status: "qr_pending", qrCode: qrDataUrl, updatedAt: new Date() })
            .where(eq(whatsappSessions.id, sessionId));

          if (!resolved) {
            resolved = true;
            resolve({ qrDataUrl });
          }
        },

        onConnected: async (phone) => {
          await db
            .update(whatsappSessions)
            .set({
              status: "connected",
              phone,
              qrCode: null,
              lastConnectedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(whatsappSessions.id, sessionId));

          if (!resolved) {
            resolved = true;
            resolve({});
          }
        },

        onDisconnected: async (reason) => {
          console.warn(`WhatsApp disconnected: ${sessionId} - ${reason}`);
          await db
            .update(whatsappSessions)
            .set({ status: "disconnected", updatedAt: new Date() })
            .where(eq(whatsappSessions.id, sessionId));
        },

        onMessageStatus: async (messageId, status) => {
          console.debug(`Message status: ${messageId} -> ${status}`);
        },

        onMessage: async (msg) => {
          // Save incoming message to chat and broadcast
          try {
            const chatMsg = await chatService.saveMessage({
              sessionId,
              phone: msg.from,
              remoteJid: msg.remoteJid,
              content: msg.message,
              direction: "incoming",
              senderType: "user",
              whatsappMessageId: msg.messageId,
              pushName: msg.pushName,
            });
            chatBroadcast.broadcast(sessionId, "new_message", chatMsg);
          } catch (chatErr: any) {
            console.error("Chat save error:", chatErr.message);
          }

          try {
            await flowExecutor.handleIncomingMessage(sessionId, msg);
          } catch (err: any) {
            console.error(`Bot flow error (session ${sessionId}):`, err.message);
          }
        },

        onPollResponse: async (vote) => {
          try {
            const campaign = await pollService.findCampaignByMessageId(vote.pollMessageId)
              || await pollService.findCampaignByQuestion(DEV_USER_ID, vote.pollName);
            if (campaign) {
              await pollService.recordResponse({
                pollCampaignId: campaign.id,
                phone: vote.from,
                selectedOptions: vote.selectedOptions,
                whatsappMessageId: vote.pollMessageId,
              });
              console.log(`[POLL] Vote recorded from ${vote.from}: ${vote.selectedOptions.join(", ")}`);
            } else {
              console.warn(`[POLL] No campaign found for poll "${vote.pollName}" (msgId: ${vote.pollMessageId})`);
            }
          } catch (err: any) {
            console.error(`Poll vote error (session ${sessionId}):`, err.message);
          }
        },
        onContactsSync: async (syncedContacts) => {
          for (const c of syncedContacts) {
            const phone = c.jid.replace("@s.whatsapp.net", "");
            try {
              // Upsert into contacts table
              const existing = await db.select().from(contacts).where(eq(contacts.phone, phone)).limit(1);
              if (existing.length === 0) {
                await db.insert(contacts).values({
                  userId: DEV_USER_ID,
                  phone,
                  name: c.name || c.notify || "",
                });
              } else if (c.name && !existing[0].name) {
                await db.update(contacts).set({ name: c.name }).where(eq(contacts.id, existing[0].id));
              }
            } catch {}
          }
        },
      });

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({});
        }
      }, 30000);
    });
  }

  async disconnectSession(sessionId: string) {
    const [session] = await db
      .select()
      .from(whatsappSessions)
      .where(eq(whatsappSessions.id, sessionId))
      .limit(1);

    if (!session) throw new Error("Session not found");

    try {
      await this.provider.disconnect(sessionId);
    } catch {
      // Provider may not have this session in memory
    }

    await db
      .update(whatsappSessions)
      .set({ status: "disconnected", qrCode: null, updatedAt: new Date() })
      .where(eq(whatsappSessions.id, sessionId));

    return { disconnected: true };
  }

  async getSessionStatus(sessionId: string) {
    const [session] = await db
      .select()
      .from(whatsappSessions)
      .where(eq(whatsappSessions.id, sessionId))
      .limit(1);

    if (!session) throw new Error("Session not found");

    const providerInfo = this.provider.getSessionInfo(sessionId);

    return {
      ...session,
      providerStatus: providerInfo?.status || "unknown",
    };
  }

  async deleteSession(sessionId: string) {
    try {
      if (this.provider.isConnected(sessionId)) {
        await this.provider.disconnect(sessionId);
      }
    } catch {
      // Session may not exist in provider memory, safe to ignore
    }

    // Remove linked campaigns first (FK has no cascade)
    await db.delete(campaigns).where(eq(campaigns.sessionId, sessionId));

    const [deleted] = await db
      .delete(whatsappSessions)
      .where(eq(whatsappSessions.id, sessionId))
      .returning({ id: whatsappSessions.id });

    return !!deleted;
  }
}
