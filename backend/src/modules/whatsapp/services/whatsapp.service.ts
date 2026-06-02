import { db } from "../../../config/database.js";
import { whatsappSessions } from "../../../infrastructure/database/schema/whatsapp-sessions.js";
import { campaigns } from "../../../infrastructure/database/schema/campaigns.js";
import { contacts } from "../../../infrastructure/database/schema/contacts.js";
import { eq } from "drizzle-orm";
import { getWhatsAppProvider } from "../../../infrastructure/whatsapp/whatsapp.factory.js";
import { decrypt } from "../../../infrastructure/security/encryption.service.js";
import QRCode from "qrcode";
import { flowExecutor } from "../../bot-builder/services/flow-executor.service.js";
import { PollService } from "../../polls/services/poll.service.js";
import { chatService } from "../../chat/services/chat.service.js";
import { chatBroadcast } from "../../chat/websocket/chat-broadcast.js";
import { logger } from "../../../config/logger.js";
import { notificationService } from "../../notifications/services/notification.service.js";

const pollService = new PollService();
const DEV_USER_ID = "00000000-0000-0000-0000-000000000000";

export class WhatsAppService {

  /**
   * Verifies that a session belongs to the given userId.
   * Throws 403 if not found or not owned by the user.
   */
  private async verifyOwnership(sessionId: string, userId: string): Promise<void> {
    const [session] = await db
      .select({ id: whatsappSessions.id, userId: whatsappSessions.userId })
      .from(whatsappSessions)
      .where(eq(whatsappSessions.id, sessionId))
      .limit(1);

    if (!session) {
      throw new Error("Session not found");
    }
    if (session.userId !== userId) {
      throw new Error("Forbidden: session does not belong to this user");
    }
  }

  // Auto-reconnect sessions that were "connected" before server restart
  async restoreSessions() {
    const sessions = await db
      .select()
      .from(whatsappSessions)
      .where(eq(whatsappSessions.status, "connected"));

    if (sessions.length === 0) {
      logger.info("No WhatsApp sessions to restore");
      return;
    }

    logger.info(`Restoring ${sessions.length} WhatsApp session(s)`);

    for (const session of sessions) {
      try {
        if (session.connectionType === "meta_cloud") {
          logger.info({ session: session.name }, 'Meta Cloud session already connected via API');
          const updateFields: Record<string, any> = { lastConnectedAt: new Date(), updatedAt: new Date() };

          // Re-fetch display phone if current phone looks like an internal ID
          if (session.metaAccessToken && session.metaPhoneNumberId) {
            const needsPhoneFix = !session.phone || !session.phone.startsWith("+");
            if (needsPhoneFix) {
              try {
                const accessToken = decrypt(session.metaAccessToken);
                const res = await fetch(
                  `https://graph.facebook.com/v21.0/${session.metaPhoneNumberId}?fields=display_phone_number`,
                  { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                const data = await res.json() as any;
                if (data.display_phone_number) {
                  updateFields.phone = data.display_phone_number;
                  logger.info({ session: session.name, phone: data.display_phone_number }, 'Updated Meta session phone');
                }
              } catch (err: any) {
                logger.warn({ session: session.name, error: err.message }, 'Could not fetch display phone for Meta session');
              }
            }
          }

          await db
            .update(whatsappSessions)
            .set(updateFields)
            .where(eq(whatsappSessions.id, session.id));
          continue;
        }

        await db
          .update(whatsappSessions)
          .set({ status: "connecting", updatedAt: new Date() })
          .where(eq(whatsappSessions.id, session.id));

        const provider = await getWhatsAppProvider(session.id);
        await provider.connect(session.id, {
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
            logger.info({ session: session.name, phone }, 'Session restored');
          },
          onDisconnected: async (reason) => {
            logger.warn({ session: session.name, reason }, 'Session disconnected during restore');
            await db
              .update(whatsappSessions)
              .set({ status: "disconnected", updatedAt: new Date() })
              .where(eq(whatsappSessions.id, session.id));
          },
          onMessageStatus: async () => {},
          onMessage: async (msg) => {
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
                mediaUrl: msg.mediaUrl,
                mediaType: msg.mediaType,
              });
              chatBroadcast.broadcast(session.id, "new_message", chatMsg);
              notificationService.create(
                session.userId,
                "new_chat",
                `Nuevo mensaje de ${msg.pushName || msg.from}`,
                (msg.message || "").substring(0, 100),
                { phone: msg.from, sessionId: session.id }
              ).catch(() => {});
            } catch (chatErr: any) {
              logger.error({ error: chatErr.message }, 'Chat save error');
            }

            try {
              await flowExecutor.handleIncomingMessage(session.id, msg);
            } catch (err: any) {
              logger.error({ session: session.name, error: err.message }, 'Bot flow error');
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
                logger.info({ from: vote.from, options: vote.selectedOptions }, 'Poll vote recorded');
              } else {
                logger.warn({ pollName: vote.pollName, msgId: vote.pollMessageId }, 'No campaign found for poll');
              }
            } catch (err: any) {
              logger.error({ session: session.name, error: err.message }, 'Poll vote error');
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
        logger.error({ session: session.name, error: err.message }, 'Failed to restore session');
        await db
          .update(whatsappSessions)
          .set({ status: "disconnected", updatedAt: new Date() })
          .where(eq(whatsappSessions.id, session.id));
      }
    }
  }

  async listSessions(userId: string) {
    return db
      .select()
      .from(whatsappSessions)
      .where(eq(whatsappSessions.userId, userId));
  }

  async createSession(userId: string, name: string) {
    const [session] = await db
      .insert(whatsappSessions)
      .values({ userId, name, status: "disconnected" })
      .returning();

    return session;
  }

  async connectSession(sessionId: string, userId: string): Promise<{ qrDataUrl?: string }> {
    await this.verifyOwnership(sessionId, userId);

    const provider = await getWhatsAppProvider(sessionId);

    return new Promise((resolve) => {
      let resolved = false;

      provider.connect(sessionId, {
        onQR: async (qr: string) => {
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

        onConnected: async (phone: string) => {
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

        onDisconnected: async (reason: string) => {
          logger.warn({ sessionId, reason }, 'WhatsApp disconnected');
          await db
            .update(whatsappSessions)
            .set({ status: "disconnected", updatedAt: new Date() })
            .where(eq(whatsappSessions.id, sessionId));
        },

        onMessageStatus: async (messageId: string, status: string) => {
          logger.debug({ messageId, status }, 'Message status update');
        },

        onMessage: async (msg: any) => {
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
              mediaUrl: msg.mediaUrl,
              mediaType: msg.mediaType,
            });
            chatBroadcast.broadcast(sessionId, "new_message", chatMsg);
            notificationService.create(
              userId,
              "new_chat",
              `Nuevo mensaje de ${msg.pushName || msg.from}`,
              (msg.message || "").substring(0, 100),
              { phone: msg.from, sessionId }
            ).catch(() => {});
          } catch (chatErr: any) {
            logger.error({ error: chatErr.message }, 'Chat save error');
          }

          try {
            await flowExecutor.handleIncomingMessage(sessionId, msg);
          } catch (err: any) {
            logger.error({ sessionId, error: err.message }, 'Bot flow error');
          }
        },

        onPollResponse: async (vote: any) => {
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
              logger.info({ from: vote.from, options: vote.selectedOptions }, 'Poll vote recorded');
            } else {
              logger.warn({ pollName: vote.pollName, msgId: vote.pollMessageId }, 'No campaign found for poll');
            }
          } catch (err: any) {
            logger.error({ sessionId, error: err.message }, 'Poll vote error');
          }
        },
        onContactsSync: async (syncedContacts: any[]) => {
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

  async disconnectSession(sessionId: string, userId: string) {
    await this.verifyOwnership(sessionId, userId);

    try {
      const provider = await getWhatsAppProvider(sessionId);
      await provider.disconnect(sessionId);
    } catch {
      // Provider may not have this session in memory
    }

    await db
      .update(whatsappSessions)
      .set({ status: "disconnected", qrCode: null, updatedAt: new Date() })
      .where(eq(whatsappSessions.id, sessionId));

    return { disconnected: true };
  }

  async getSessionStatus(sessionId: string, userId: string) {
    await this.verifyOwnership(sessionId, userId);

    const [session] = await db
      .select()
      .from(whatsappSessions)
      .where(eq(whatsappSessions.id, sessionId))
      .limit(1);

    if (!session) throw new Error("Session not found");

    const provider = await getWhatsAppProvider(sessionId);
    const providerInfo = provider.getSessionInfo(sessionId);

    return {
      ...session,
      providerStatus: providerInfo?.status || "unknown",
    };
  }

  async deleteSession(sessionId: string, userId: string) {
    await this.verifyOwnership(sessionId, userId);

    try {
      const provider = await getWhatsAppProvider(sessionId);
      if (provider.isConnected(sessionId)) {
        await provider.disconnect(sessionId);
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
