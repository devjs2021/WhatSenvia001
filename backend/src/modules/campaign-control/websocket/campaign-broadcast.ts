// @ts-ignore - ws types may not be installed
import { WebSocket } from "ws";

interface CampaignClient {
  ws: WebSocket;
  userId: string;
}

class CampaignBroadcast {
  private clients: Set<CampaignClient> = new Set();

  addClient(ws: WebSocket, userId: string) {
    const client: CampaignClient = { ws, userId };
    this.clients.add(client);
    ws.on("close", () => this.clients.delete(client));
  }

  broadcast(userId: string, event: string, data: any) {
    const message = JSON.stringify({ event, data });
    for (const client of this.clients) {
      if (
        client.userId === userId &&
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

export const campaignBroadcast = new CampaignBroadcast();
