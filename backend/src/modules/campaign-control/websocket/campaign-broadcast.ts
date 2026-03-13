// @ts-ignore - ws types may not be installed
import { WebSocket } from "ws";

interface CampaignClient {
  ws: WebSocket;
}

class CampaignBroadcast {
  private clients: Set<CampaignClient> = new Set();

  addClient(ws: WebSocket) {
    const client: CampaignClient = { ws };
    this.clients.add(client);
    ws.on("close", () => this.clients.delete(client));
  }

  broadcast(event: string, data: any) {
    const message = JSON.stringify({ event, data });
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }
}

export const campaignBroadcast = new CampaignBroadcast();
