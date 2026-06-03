"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";

export function PwaRegister() {
  const { token } = useAuth();
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Register service worker
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        setSwRegistration(reg);
      })
      .catch(() => {});
  }, []);

  // Subscribe to push when logged in
  useEffect(() => {
    if (!token || !swRegistration) return;

    async function subscribePush() {
      if (!("PushManager" in window)) return;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      try {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) return;

        let subscription = await swRegistration!.pushManager.getSubscription();

        if (!subscription) {
          subscription = await swRegistration!.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
          });
        }

        await api.post("/push/subscribe", { subscription: subscription.toJSON() });
      } catch {}
    }

    subscribePush();
  }, [token, swRegistration]);

  return null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
