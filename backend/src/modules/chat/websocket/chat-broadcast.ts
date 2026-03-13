// @ts-ignore - ws types may not be installed
import { WebSocket } from "ws";

interface WsClient {
  ws: WebSocket;
  sessionId: string;
}

class ChatBroadcast {
  private clients: Set<WsClient> = new Set();

  addClient(ws: WebSocket, sessionId: string) {
    const client: WsClient = { ws, sessionId };
    this.clients.add(client);

    ws.on("close", () => {
      this.clients.delete(client);
    });
  }

  broadcast(sessionId: string, event: string, data: any) {
    const message = JSON.stringify({ event, data });
    for (const client of this.clients) {
      if (
        client.sessionId === sessionId &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        client.ws.send(message);
      }
    }
  }

  broadcastAll(event: string, data: any) {
    const message = JSON.stringify({ event, data });
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }
}

export const chatBroadcast = new ChatBroadcast();
