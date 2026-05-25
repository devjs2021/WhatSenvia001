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
    console.log('🔍 DEBUG broadcast - cliente añadido, sessionId:', sessionId, 'total clientes:', this.clients.size);

    ws.on("close", () => {
      this.clients.delete(client);
      console.log('🔍 DEBUG broadcast - cliente removido, sessionId:', sessionId, 'total clientes:', this.clients.size);
    });
  }

  broadcast(sessionId: string, event: string, data: any) {
    console.log('🔍 DEBUG broadcast - sessionId:', sessionId, 'event:', event, 'clientes conectados:', this.clients.size);
    const clientSessionIds = [...this.clients].map(c => c.sessionId);
    console.log('🔍 DEBUG broadcast - sessionIds de clientes:', clientSessionIds);
    let sent = 0;
    const message = JSON.stringify({ event, data });
    for (const client of this.clients) {
      if (
        client.sessionId === sessionId &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        client.ws.send(message);
        sent++;
      }
    }
    console.log('🔍 DEBUG broadcast - mensajes enviados a', sent, 'clientes');
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
