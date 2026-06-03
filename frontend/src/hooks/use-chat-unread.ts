"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useCallback } from "react";

interface UnreadResponse {
  counts: Record<string, number>;
  total: number;
}

export function useChatUnread() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["chat-unread"],
    queryFn: () => api.get<UnreadResponse>("/chat/unread"),
    refetchInterval: 10000,
    enabled: !!token,
  });

  const markAsRead = useCallback(
    async (phone: string) => {
      await api.post("/chat/mark-read", { phone });
      queryClient.invalidateQueries({ queryKey: ["chat-unread"] });
    },
    [queryClient]
  );

  return {
    unreadCounts: data?.counts || {},
    totalUnread: data?.total || 0,
    markAsRead,
  };
}
