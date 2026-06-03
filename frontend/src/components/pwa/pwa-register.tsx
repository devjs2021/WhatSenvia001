"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { useChatUnread } from "@/hooks/use-chat-unread";
import { api } from "@/lib/api";

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

export function PwaRegister() {
  const { token } = useAuth();
  const { unreadCount: notifUnread } = useNotifications();
  const { totalUnread: chatUnread } = useChatUnread();
  const subscribedRef = useRef(false);

  // Register service worker
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  // Subscribe to push
  useEffect(() => {
    if (!token || subscribedRef.current) return;

    async function subscribePush() {
      if (!("PushManager" in window) || !VAPID_KEY) return;

      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const reg = await navigator.serviceWorker.ready;
        let subscription = await reg.pushManager.getSubscription();

        if (!subscription) {
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: VAPID_KEY,
          });
        }

        await api.post("/push/subscribe", { subscription: subscription.toJSON() });
        subscribedRef.current = true;
      } catch {}
    }

    subscribePush();
  }, [token]);

  // Update app icon badge with total unread count
  useEffect(() => {
    const total = notifUnread + chatUnread;
    if ("setAppBadge" in navigator) {
      if (total > 0) {
        (navigator as any).setAppBadge(total).catch(() => {});
      } else {
        (navigator as any).clearAppBadge().catch(() => {});
      }
    }
  }, [notifUnread, chatUnread]);

  return null;
}
