"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useChatWebSocket(sessionIds: string[], token: string | null) {
  const queryClient = useQueryClient();
  const socketsRef = useRef<WebSocket[]>([]);
  const sessionKey = sessionIds.slice().sort().join(",");

  useEffect(() => {
    if (!token || sessionIds.length === 0) return;

    const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
    const wsBase = apiBase.replace(/^https?/, (m) => (m === "https" ? "wss" : "ws"));

    // Close any previous connections
    socketsRef.current.forEach((ws) => ws.close());
    socketsRef.current = [];

    const sockets = sessionIds.map((sessionId) => {
      const url = `${wsBase}/api/chat/ws?token=${token}&sessionId=${sessionId}`;
      const ws = new WebSocket(url);

      ws.onmessage = (event) => {
        try {
          const { event: type } = JSON.parse(event.data) as { event: string };
          if (type === "new_message") {
            queryClient.invalidateQueries({ queryKey: ["chat-contacts"] });
            queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
            queryClient.invalidateQueries({ queryKey: ["chat-unread"] });
          }
        } catch {}
      };

      ws.onerror = () => {};

      return ws;
    });

    socketsRef.current = sockets;

    return () => {
      sockets.forEach((ws) => ws.close());
      socketsRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, token]);
}
