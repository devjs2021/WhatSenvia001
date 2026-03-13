import { db } from "../../../config/database.js";
import { botFlows, botSettings, botAiConfig } from "../../../infrastructure/database/schema/bot-flows.js";
import { eq, and } from "drizzle-orm";
import { getWhatsAppProvider } from "../../../infrastructure/whatsapp/whatsapp.factory.js";
import type { IncomingMessage } from "../../../infrastructure/whatsapp/interfaces/whatsapp-provider.interface.js";
import { chatService } from "../../chat/services/chat.service.js";
import { chatBroadcast } from "../../chat/websocket/chat-broadcast.js";

const provider = getWhatsAppProvider();

// In-memory conversation state: phone -> { flowId, currentNodeId, variables, waitingForInput }
interface ConversationState {
  flowId: string;
  sessionId: string;
  remoteJid: string; // raw JID for replying (e.g. "573xxx@s.whatsapp.net" or "xxx@lid")
  currentNodeId: string | null;
  variables: Record<string, string>;
  waitingForInput?: string; // nodeId of ask node waiting for answer
  lastActivity: number;
}

const conversations = new Map<string, ConversationState>();

// Clean up stale conversations (older than 30 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, state] of conversations) {
    if (now - state.lastActivity > 30 * 60 * 1000) {
      conversations.delete(key);
    }
  }
}, 5 * 60 * 1000);

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

export class FlowExecutorService {
  /**
   * Handle an incoming WhatsApp message.
   * Finds matching active flows for the session and executes them.
   */
  async handleIncomingMessage(sessionId: string, incoming: IncomingMessage) {
    console.log(`[BOT] Incoming message from ${incoming.from}: "${incoming.message}" (session: ${sessionId}, group: ${incoming.isGroup})`);
    if (incoming.isGroup) return; // Skip group messages

    const phone = incoming.from;
    const text = incoming.message.trim();

    // Check if there's an ongoing conversation waiting for input
    const existingState = conversations.get(phone);
    if (existingState && existingState.sessionId === sessionId && existingState.waitingForInput) {
      await this.handleWaitingInput(phone, text, existingState);
      return;
    }

    // Find active flows assigned to this session
    const activeFlows = await db
      .select()
      .from(botFlows)
      .where(and(eq(botFlows.sessionId, sessionId), eq(botFlows.status, "active")));

    console.log(`[BOT] Found ${activeFlows.length} active flows for session ${sessionId}`);
    if (activeFlows.length === 0) return;

    // Check bot settings mode
    const userId = activeFlows[0].userId;
    const [settings] = await db
      .select()
      .from(botSettings)
      .where(eq(botSettings.userId, userId))
      .limit(1);

    const mode = settings?.mode || "hybrid";

    // Find a flow whose trigger matches the message
    for (const flow of activeFlows) {
      const nodes = (flow.nodes || []) as FlowNode[];
      const edges = (flow.edges || []) as FlowEdge[];

      const triggerNode = nodes.find((n) => n.type === "trigger");
      if (!triggerNode) continue;

      const matched = this.matchTrigger(triggerNode, text, !existingState);
      console.log(`[BOT] Trigger "${triggerNode.data.triggerType}" match: ${matched} (isFirstMessage: ${!existingState})`);
      if (!matched) continue;

      // Start executing from the trigger node
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
      conversations.set(phone, state);

      // Follow edges from trigger and execute
      await this.executeFromNode(triggerNode.id, nodes, edges, state, phone);
      return;
    }

    // No flow matched - if hybrid mode, try AI response
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
    // Find edges from this node
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
        // Node is waiting for user input (ask node)
        return;
      }

      if (result === "stop") {
        // Node terminated the flow (transfer agent, go to flow terminal)
        conversations.delete(phone);
        return;
      }

      // result is sourceHandle or undefined - continue to next nodes
      await this.executeFromNode(nextNode.id, nodes, edges, state, phone, result || undefined);
    }
  }

  /**
   * Execute a single node. Returns:
   * - undefined: continue normally (follow default edges)
   * - "wait": pause execution, waiting for user input
   * - "stop": terminate the flow
   * - string: a specific sourceHandle to follow (for conditions/buttons)
   */
  private async executeNode(
    node: FlowNode,
    state: ConversationState,
    phone: string,
  ): Promise<string | undefined> {
    const jid = state.remoteJid;

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
          await provider.sendMessage(state.sessionId, {
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
        const buttonList = buttons
          .map((b, i) => `${b.emoji || (i + 1)} ${b.text}`)
          .join("\n");
        const fullMessage = `${text}\n\n${buttonList}`;
        await this.sendMessage(state.sessionId, jid, fullMessage);

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
        const seconds = Math.min(node.data.seconds || 3, 30); // Cap at 30s
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
        conversations.delete(phone);
        return "stop";
      }

      case "goToFlow": {
        // Load and execute the target flow
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
                await this.executeFromNode(triggerNode.id, targetNodes, targetEdges, state, phone);
              }
            }
          } catch {
            // Silently fail
          }
        }
        return "stop";
      }

      default:
        return undefined;
    }
  }

  private async handleWaitingInput(phone: string, text: string, state: ConversationState) {
    const flow = await db
      .select()
      .from(botFlows)
      .where(eq(botFlows.id, state.flowId))
      .limit(1);

    if (!flow[0]) {
      conversations.delete(phone);
      return;
    }

    const nodes = (flow[0].nodes || []) as FlowNode[];
    const edges = (flow[0].edges || []) as FlowEdge[];
    const waitingNode = nodes.find((n) => n.id === state.waitingForInput);

    if (!waitingNode) {
      conversations.delete(phone);
      return;
    }

    state.waitingForInput = undefined;
    state.variables.message = text;
    state.lastActivity = Date.now();

    if (waitingNode.type === "ask") {
      // Store answer in variable
      const varName = waitingNode.data.variableName || "answer";
      state.variables[varName] = text;
      // Continue flow from this node
      await this.executeFromNode(waitingNode.id, nodes, edges, state, phone);
    } else if (waitingNode.type === "buttons") {
      // Match button selection
      const buttons = (waitingNode.data.buttons || []) as { text: string; emoji: string }[];
      const lowerText = text.toLowerCase();
      const matchedIndex = buttons.findIndex(
        (b, i) =>
          lowerText === b.text.toLowerCase() ||
          lowerText === String(i + 1) ||
          lowerText === b.emoji,
      );

      if (matchedIndex >= 0) {
        state.variables.button_selection = buttons[matchedIndex].text;
        // Follow the specific button handle
        await this.executeFromNode(waitingNode.id, nodes, edges, state, phone, `btn-${matchedIndex}`);
      } else {
        // No match - follow default edge
        state.variables.button_selection = text;
        await this.executeFromNode(waitingNode.id, nodes, edges, state, phone);
      }
    }
  }

  private async handleAIResponse(userId: string, sessionId: string, remoteJid: string, text: string) {
    try {
      const aiResponse = await this.getAIResponse(userId, text);
      if (aiResponse) {
        await this.sendMessage(sessionId, remoteJid, aiResponse);
      }
    } catch {
      // AI not configured or error - silently ignore
    }
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

    throw new Error("Proveedor no soportado");
  }

  private evaluateCondition(variable: string, operator: string, value: string): boolean {
    const lower = variable.toLowerCase();
    const lowerValue = value.toLowerCase();

    switch (operator) {
      case "equals":
        return lower === lowerValue;
      case "not_equals":
        return lower !== lowerValue;
      case "contains":
        return lower.includes(lowerValue);
      case "starts_with":
        return lower.startsWith(lowerValue);
      case "greater_than":
        return parseFloat(variable) > parseFloat(value);
      case "less_than":
        return parseFloat(variable) < parseFloat(value);
      default:
        return false;
    }
  }

  private replaceVariables(text: string, variables: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || "");
  }

  private async sendMessage(sessionId: string, remoteJid: string, text: string) {
    try {
      // Pass remoteJid directly as phone — formatJid will detect the "@" and use it as-is
      const result = await provider.sendMessage(sessionId, { phone: remoteJid, message: text });

      // Save bot message to chat and broadcast
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
