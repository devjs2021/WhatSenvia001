"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";

export interface Notification {
  id: string;
  userId: string;
  type: "new_chat" | "campaign_completed" | "campaign_failed" | "system_error" | "campaign_scheduled";
  title: string;
  body: string | null;
  metadata: string | null;
  read: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  items: Notification[];
  unreadCount: number;
}

export function useNotifications() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<NotificationsResponse>("/notifications"),
    refetchInterval: 30000,
    enabled: !!token,
  });

  const notifications = data?.items || [];
  const unreadCount = data?.unreadCount || 0;

  // WebSocket for real-time
  useEffect(() => {
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const apiBase = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
    const wsHost = apiBase.replace(/^https?:\/\//, "");
    const wsUrl = `${protocol}//${wsHost}/api/notifications/ws?token=${token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.event === "new_notification") {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      } catch {}
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [token, queryClient]);

  const markAsRead = useCallback(
    async (id: string) => {
      await api.patch(`/notifications/${id}/read`, {});
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    [queryClient]
  );

  const markAllAsRead = useCallback(async () => {
    await api.patch("/notifications/read-all", {});
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  return { notifications, unreadCount, isLoading, markAsRead, markAllAsRead };
}
