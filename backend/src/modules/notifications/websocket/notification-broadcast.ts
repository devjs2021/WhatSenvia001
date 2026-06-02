// @ts-ignore - ws types may not be installed
import { WebSocket } from "ws";

interface NotificationClient {
  ws: WebSocket;
  userId: string;
}

class NotificationBroadcast {
  private clients: Set<NotificationClient> = new Set();

  addClient(ws: WebSocket, userId: string) {
    const client: NotificationClient = { ws, userId };
    this.clients.add(client);
    ws.on("close", () => this.clients.delete(client));
  }

  broadcast(userId: string, event: string, data: any) {
    const message = JSON.stringify({ event, data });
    for (const client of this.clients) {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }
}

export const notificationBroadcast = new NotificationBroadcast();
