import { db } from "../../../config/database.js";
import { botFlows, botSettings, botAiConfig, botConversationStates } from "../../../infrastructure/database/schema/bot-flows.js";
import { whatsappSessions } from "../../../infrastructure/database/schema/whatsapp-sessions.js";
import { eq, and, lt } from "drizzle-orm";
import { getWhatsAppProvider } from "../../../infrastructure/whatsapp/whatsapp.factory.js";
import type { IncomingMessage } from "../../../infrastructure/whatsapp/interfaces/whatsapp-provider.interface.js";
import { chatService } from "../../chat/services/chat.service.js";
import { chatBroadcast } from "../../chat/websocket/chat-broadcast.js";

interface ConversationState {
  id?: string;
  flowId: string;
  sessionId: string;
  remoteJid: string;
  currentNodeId: string | null;
  variables: Record<string, string>;
  waitingForInput?: string;
  lastActivity: number;
}

interface FlowNode {
  id: string;
  type: string;
  data: Record<string, any>;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
}

type ProviderType = "baileys" | "meta_cloud";

// Clean up stale conversations (older than 30 minutes)
setInterval(async () => {
  try {
    const cutoff = Date.now() - 30 * 60 * 1000;
    await db.delete(botConversationStates).where(lt(botConversationStates.lastActivity, cutoff));
  } catch {}
}, 5 * 60 * 1000);

export class FlowExecutorService {
  // --- State persistence ---

  private async getState(phone: string, sessionId: string): Promise<ConversationState | null> {
    const [row] = await db
      .select()
      .from(botConversationStates)
      .where(and(eq(botConversationStates.phone, phone), eq(botConversationStates.sessionId, sessionId)))
      .limit(1);

    if (!row) return null;
    return {
      id: row.id,
      flowId: row.flowId,
      sessionId: row.sessionId,
      remoteJid: row.remoteJid,
      currentNodeId: row.currentNodeId,
      variables: (row.variables as Record<string, string>) || {},
      waitingForInput: row.waitingForInput || undefined,
      lastActivity: row.lastActivity,
    };
  }

  private async saveState(phone: string, state: ConversationState) {
    if (state.id) {
      await db.update(botConversationStates).set({
        flowId: state.flowId,
        remoteJid: state.remoteJid,
        currentNodeId: state.currentNodeId,
        variables: state.variables,
        waitingForInput: state.waitingForInput || null,
        lastActivity: state.lastActivity,
      }).where(eq(botConversationStates.id, state.id));
    } else {
      const [row] = await db.insert(botConversationStates).values({
        phone,
        sessionId: state.sessionId,
        flowId: state.flowId,
        remoteJid: state.remoteJid,
        currentNodeId: state.currentNodeId,
        variables: state.variables,
        waitingForInput: state.waitingForInput || null,
        lastActivity: state.lastActivity,
      }).returning({ id: botConversationStates.id });
      state.id = row.id;
    }
  }

  private async deleteState(phone: string, sessionId: string) {
    await db.delete(botConversationStates).where(
      and(eq(botConversationStates.phone, phone), eq(botConversationStates.sessionId, sessionId))
    );
  }

  // --- Provider detection ---

  private async getProviderType(sessionId: string): Promise<ProviderType> {
    const [session] = await db
      .select({ connectionType: whatsappSessions.connectionType })
      .from(whatsappSessions)
      .where(eq(whatsappSessions.id, sessionId))
      .limit(1);
    return (session?.connectionType as ProviderType) || "baileys";
  }

  // --- Main entry ---

  async handleIncomingMessage(sessionId: string, incoming: IncomingMessage) {
    console.log(`[BOT] Incoming message from ${incoming.from}: "${incoming.message}" (session: ${sessionId}, group: ${incoming.isGroup})`);
    if (incoming.isGroup) return;

    const phone = incoming.from;
    const text = incoming.message.trim();

    const existingState = await this.getState(phone, sessionId);
    if (existingState && existingState.waitingForInput) {
      await this.handleWaitingInput(phone, text, existingState);
      return;
    }

    const activeFlows = await db
      .select()
      .from(botFlows)
      .where(and(eq(botFlows.sessionId, sessionId), eq(botFlows.status, "active")));

    console.log(`[BOT] Found ${activeFlows.length} active flows for session ${sessionId}`);
    if (activeFlows.length === 0) return;

    const userId = activeFlows[0].userId;
    const [settings] = await db
      .select()
      .from(botSettings)
      .where(eq(botSettings.userId, userId))
      .limit(1);

    const mode = settings?.mode || "hybrid";

    for (const flow of activeFlows) {
      const nodes = (flow.nodes || []) as FlowNode[];
      const edges = (flow.edges || []) as FlowEdge[];

      const triggerNode = nodes.find((n) => n.type === "trigger");
      if (!triggerNode) continue;

      const matched = this.matchTrigger(triggerNode, text, !existingState);
      console.log(`[BOT] Trigger "${triggerNode.data.triggerType}" match: ${matched} (isFirstMessage: ${!existingState})`);
      if (!matched) continue;

      const state: ConversationState = {
        flowId: flow.id,
        sessionId,
        remoteJid: incoming.remoteJid,
        currentNodeId: triggerNode.id,
        variables: {
          phone,
          name: incoming.pushName || phone,
          message: text,
        },
        lastActivity: Date.now(),
      };
      await this.saveState(phone, state);

      await this.executeFromNode(triggerNode.id, nodes, edges, state, phone);
      return;
    }

    if (mode === "ia_complete" || mode === "hybrid") {
      await this.handleAIResponse(userId, sessionId, incoming.remoteJid, text);
    }
  }

  private matchTrigger(triggerNode: FlowNode, text: string, isFirstMessage: boolean): boolean {
    const type = triggerNode.data.triggerType || "contains_keyword";
    const value = (triggerNode.data.value || "").toLowerCase();
    const lowerText = text.toLowerCase();

    switch (type) {
      case "any_message":
        return true;
      case "first_message":
        return isFirstMessage;
      case "exact_match":
        return lowerText === value;
      case "starts_with":
        return lowerText.startsWith(value);
      case "contains_keyword":
      default:
        return value.split(",").some((kw: string) => lowerText.includes(kw.trim()));
    }
  }

  private async executeFromNode(
    fromNodeId: string,
    nodes: FlowNode[],
    edges: FlowEdge[],
    state: ConversationState,
    phone: string,
    sourceHandle?: string,
  ) {
    const outEdges = edges.filter((e) => {
      if (e.source !== fromNodeId) return false;
      if (sourceHandle !== undefined) return e.sourceHandle === sourceHandle;
      return true;
    });

    for (const edge of outEdges) {
      const nextNode = nodes.find((n) => n.id === edge.target);
      if (!nextNode) continue;

      state.currentNodeId = nextNode.id;
      state.lastActivity = Date.now();

      const result = await this.executeNode(nextNode, state, phone);

      if (result === "wait") {
        await this.saveState(phone, state);
        return;
      }

      if (result === "stop") {
        await this.deleteState(phone, state.sessionId);
        return;
      }

      await this.executeFromNode(nextNode.id, nodes, edges, state, phone, result || undefined);
    }
  }

  private async executeNode(
    node: FlowNode,
    state: ConversationState,
    phone: string,
  ): Promise<string | undefined> {
    const jid = state.remoteJid;
    const providerType = await this.getProviderType(state.sessionId);

    switch (node.type) {
      case "message": {
        const text = this.replaceVariables(node.data.message || "", state.variables);
        if (text) {
          await this.sendMessage(state.sessionId, jid, text);
        }
        return undefined;
      }

      case "media": {
        const caption = this.replaceVariables(node.data.caption || "", state.variables);
        const url = node.data.url || "";
        const mediaType = node.data.mediaType || "image";
        if (url) {
          const p = await getWhatsAppProvider(state.sessionId);
          await p.sendMessage(state.sessionId, {
            phone: jid,
            message: caption,
            mediaUrl: url,
            mediaType,
          });
        }
        return undefined;
      }

      case "buttons": {
        const text = this.replaceVariables(node.data.message || "", state.variables);
        const buttons = (node.data.buttons || []) as { text: string; emoji: string }[];

        await this.sendInteractiveButtons(state.sessionId, jid, text, buttons, providerType);

        state.waitingForInput = node.id;
        return "wait";
      }

      case "ask": {
        const question = this.replaceVariables(node.data.question || "", state.variables);
        if (question) {
          await this.sendMessage(state.sessionId, jid, question);
        }
        state.waitingForInput = node.id;
        return "wait";
      }

      case "condition": {
        const variable = state.variables[node.data.variable || ""] || "";
        const value = node.data.value || "";
        const operator = node.data.operator || "equals";
        const matched = this.evaluateCondition(variable, operator, value);
        return matched ? "yes" : "no";
      }

      case "delay": {
        const seconds = Math.min(node.data.seconds || 3, 30);
        await new Promise((r) => setTimeout(r, seconds * 1000));
        return undefined;
      }

      case "variable": {
        const varName = node.data.variableName || "";
        const varValue = this.replaceVariables(node.data.value || "", state.variables);
        if (varName) {
          state.variables[varName] = varValue;
        }
        return undefined;
      }

      case "aiResponse": {
        const context = node.data.context || "";
        try {
          const flow = await db
            .select()
            .from(botFlows)
            .where(eq(botFlows.id, state.flowId))
            .limit(1);
          if (flow[0]) {
            const aiResponse = await this.getAIResponse(
              flow[0].userId,
              state.variables.message || "",
              context,
            );
            await this.sendMessage(state.sessionId, jid, aiResponse);
          }
        } catch {
          await this.sendMessage(state.sessionId, jid, "Lo siento, no pude procesar tu solicitud.");
        }
        return undefined;
      }

      case "transferAgent": {
        const msg = this.replaceVariables(
          node.data.message || "Te estamos transfiriendo con un agente.",
          state.variables,
        );
        await this.sendMessage(state.sessionId, jid, msg);
        await this.deleteState(phone, state.sessionId);
        return "stop";
      }

      case "goToFlow": {
        const targetFlowId = node.data.targetFlowId;
        if (targetFlowId) {
          try {
            const [targetFlow] = await db
              .select()
              .from(botFlows)
              .where(eq(botFlows.id, targetFlowId))
              .limit(1);

            if (targetFlow) {
              const targetNodes = (targetFlow.nodes || []) as FlowNode[];
              const targetEdges = (targetFlow.edges || []) as FlowEdge[];
              const triggerNode = targetNodes.find((n) => n.type === "trigger");
              if (triggerNode) {
                state.flowId = targetFlowId;
                await this.saveState(phone, state);
                await this.executeFromNode(triggerNode.id, targetNodes, targetEdges, state, phone);
              }
            }
          } catch {}
        }
        return "stop";
      }

      default:
        return undefined;
    }
  }

  // --- Interactive buttons: native for both providers ---

  private async sendInteractiveButtons(
    sessionId: string,
    remoteJid: string,
    text: string,
    buttons: { text: string; emoji: string }[],
    providerType: ProviderType,
  ) {
    const provider = await getWhatsAppProvider(sessionId);
    const phone = remoteJid.replace(/@.*$/, "");

    if (providerType === "meta_cloud") {
      // Meta Cloud API: interactive reply buttons (max 3)
      const metaButtons = buttons.slice(0, 3).map((b, i) => ({
        type: "reply" as const,
        reply: { id: `btn-${i}`, title: `${b.emoji || ""} ${b.text}`.trim().substring(0, 20) },
      }));

      const metaProvider = provider as any;
      const url = `https://graph.facebook.com/v21.0/${metaProvider.phoneNumberId}/messages`;
      const body = {
        messaging_product: "whatsapp",
        to: phone.replace(/[^0-9]/g, ""),
        type: "interactive",
        interactive: {
          type: "button",
          body: { text },
          action: { buttons: metaButtons },
        },
      };

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${metaProvider.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        const data: any = await res.json();

        // Save to chat
        try {
          const buttonList = buttons.map((b, i) => `${b.emoji || (i + 1)} ${b.text}`).join("\n");
          const chatMsg = await chatService.saveMessage({
            sessionId,
            phone,
            remoteJid,
            content: `${text}\n\n${buttonList}`,
            direction: "outgoing",
            senderType: "bot",
            whatsappMessageId: data.messages?.[0]?.id,
          });
          chatBroadcast.broadcast(sessionId, "new_message", chatMsg);
        } catch {}

        return;
      } catch {
        // Fallback to text
      }
    }

    if (providerType === "baileys") {
      // Baileys: use native button message
      const baileysProvider = provider as any;
      const session = baileysProvider.sessions?.get(sessionId);
      if (session?.socket) {
        const jid = remoteJid.includes("@") ? remoteJid : `${remoteJid.replace(/[^0-9]/g, "")}@s.whatsapp.net`;
        try {
          const buttonMsg = {
            text,
            buttons: buttons.slice(0, 3).map((b, i) => ({
              buttonId: `btn-${i}`,
              buttonText: { displayText: `${b.emoji || ""} ${b.text}`.trim() },
              type: 1,
            })),
            headerType: 1,
          };
          const result = await session.socket.sendMessage(jid, buttonMsg);

          try {
            const chatMsg = await chatService.saveMessage({
              sessionId,
              phone,
              remoteJid,
              content: `${text}\n\n${buttons.map((b, i) => `${b.emoji || (i + 1)} ${b.text}`).join("\n")}`,
              direction: "outgoing",
              senderType: "bot",
              whatsappMessageId: result?.key?.id,
            });
            chatBroadcast.broadcast(sessionId, "new_message", chatMsg);
          } catch {}

          return;
        } catch {
          // Baileys buttons may not work on all versions, fallback to text
        }
      }
    }

    // Fallback: plain text buttons (works everywhere)
    const buttonList = buttons.map((b, i) => `${b.emoji || (i + 1)} ${b.text}`).join("\n");
    const fullMessage = `${text}\n\n${buttonList}`;
    await this.sendMessage(sessionId, remoteJid, fullMessage);
  }

  // --- Handle waiting input ---

  private async handleWaitingInput(phone: string, text: string, state: ConversationState) {
    const flow = await db
      .select()
      .from(botFlows)
      .where(eq(botFlows.id, state.flowId))
      .limit(1);

    if (!flow[0]) {
      await this.deleteState(phone, state.sessionId);
      return;
    }

    const nodes = (flow[0].nodes || []) as FlowNode[];
    const edges = (flow[0].edges || []) as FlowEdge[];
    const waitingNode = nodes.find((n) => n.id === state.waitingForInput);

    if (!waitingNode) {
      await this.deleteState(phone, state.sessionId);
      return;
    }

    state.waitingForInput = undefined;
    state.variables.message = text;
    state.lastActivity = Date.now();

    if (waitingNode.type === "ask") {
      const varName = waitingNode.data.variableName || "answer";
      state.variables[varName] = text;
      await this.saveState(phone, state);
      await this.executeFromNode(waitingNode.id, nodes, edges, state, phone);
    } else if (waitingNode.type === "buttons") {
      const buttons = (waitingNode.data.buttons || []) as { text: string; emoji: string }[];
      const lowerText = text.toLowerCase();

      // Match by: button ID (btn-0), text, index, or emoji
      let matchedIndex = -1;
      const btnIdMatch = text.match(/^btn-(\d+)$/);
      if (btnIdMatch) {
        matchedIndex = parseInt(btnIdMatch[1]);
      } else {
        matchedIndex = buttons.findIndex(
          (b, i) =>
            lowerText === b.text.toLowerCase() ||
            lowerText === String(i + 1) ||
            lowerText === b.emoji,
        );
      }

      if (matchedIndex >= 0 && matchedIndex < buttons.length) {
        state.variables.button_selection = buttons[matchedIndex].text;
        await this.saveState(phone, state);
        await this.executeFromNode(waitingNode.id, nodes, edges, state, phone, `btn-${matchedIndex}`);
      } else {
        state.variables.button_selection = text;
        await this.saveState(phone, state);
        await this.executeFromNode(waitingNode.id, nodes, edges, state, phone);
      }
    }
  }

  // --- AI ---

  private async handleAIResponse(userId: string, sessionId: string, remoteJid: string, text: string) {
    try {
      const aiResponse = await this.getAIResponse(userId, text);
      if (aiResponse) {
        await this.sendMessage(sessionId, remoteJid, aiResponse);
      }
    } catch {}
  }

  private async getAIResponse(userId: string, userMessage: string, extraContext?: string): Promise<string> {
    const [config] = await db
      .select()
      .from(botAiConfig)
      .where(eq(botAiConfig.userId, userId))
      .limit(1);

    if (!config || !config.apiKey) throw new Error("No AI config");

    const systemPrompt = config.systemPrompt || "Eres un asistente virtual amable y util.";
    const contextParts: string[] = [];
    if (config.businessInfo) contextParts.push(`[Informacion del negocio]:\n${config.businessInfo}`);
    if (config.faqs) contextParts.push(`[Preguntas frecuentes]:\n${config.faqs}`);
    if (config.ragEnabled) {
      const ragContext = (config.ragFiles as any[] || [])
        .map((f: { name: string; content: string }) => `[${f.name}]:\n${f.content}`)
        .join("\n\n");
      if (ragContext) contextParts.push(ragContext);
    }
    if (extraContext) contextParts.push(`[Contexto adicional]:\n${extraContext}`);

    const fullSystemPrompt = contextParts.length > 0
      ? `${systemPrompt}\n\nUsa la siguiente informacion como contexto para responder:\n\n${contextParts.join("\n\n")}`
      : systemPrompt;

    if (config.provider === "google") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: fullSystemPrompt }] },
          contents: [{ parts: [{ text: userMessage }] }],
          generationConfig: {
            temperature: parseFloat(config.temperature || "0.7"),
            maxOutputTokens: parseInt(config.maxTokens || "1000"),
          },
        }),
      });
      if (!res.ok) throw new Error(`Google API error: ${res.status}`);
      const data = await res.json() as any;
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta";
    }

    if (config.provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: fullSystemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: parseFloat(config.temperature || "0.7"),
          max_tokens: parseInt(config.maxTokens || "1000"),
        }),
      });
      if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
      const data = await res.json() as any;
      return data.choices?.[0]?.message?.content || "Sin respuesta";
    }

    if (config.provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.model,
          system: fullSystemPrompt,
          max_tokens: parseInt(config.maxTokens || "1000"),
          messages: [{ role: "user", content: userMessage }],
        }),
      });
      if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
      const data = await res.json() as any;
      return data.content?.[0]?.text || "Sin respuesta";
    }

    if (config.provider === "deepseek") {
      const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: fullSystemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: parseFloat(config.temperature || "0.7"),
          max_tokens: parseInt(config.maxTokens || "1000"),
        }),
      });
      if (!res.ok) throw new Error(`DeepSeek API error: ${res.status}`);
      const data = await res.json() as any;
      return data.choices?.[0]?.message?.content || "Sin respuesta";
    }

    throw new Error("Proveedor no soportado");
  }

  // --- Helpers ---

  private evaluateCondition(variable: string, operator: string, value: string): boolean {
    const lower = variable.toLowerCase();
    const lowerValue = value.toLowerCase();

    switch (operator) {
      case "equals": return lower === lowerValue;
      case "not_equals": return lower !== lowerValue;
      case "contains": return lower.includes(lowerValue);
      case "starts_with": return lower.startsWith(lowerValue);
      case "greater_than": return parseFloat(variable) > parseFloat(value);
      case "less_than": return parseFloat(variable) < parseFloat(value);
      default: return false;
    }
  }

  private replaceVariables(text: string, variables: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || "");
  }

  private async sendMessage(sessionId: string, remoteJid: string, text: string) {
    try {
      const p = await getWhatsAppProvider(sessionId);
      const result = await p.sendMessage(sessionId, { phone: remoteJid, message: text });

      try {
        const phone = remoteJid.replace(/@.*$/, "");
        const chatMsg = await chatService.saveMessage({
          sessionId,
          phone,
          remoteJid,
          content: text,
          direction: "outgoing",
          senderType: "bot",
          whatsappMessageId: result.messageId,
        });
        chatBroadcast.broadcast(sessionId, "new_message", chatMsg);
      } catch (chatErr: any) {
        console.error("Chat save error (bot):", chatErr.message);
      }
    } catch (err) {
      console.error(`Failed to send bot message to ${remoteJid}:`, err);
    }
  }
}

// Singleton
export const flowExecutor = new FlowExecutorService();
