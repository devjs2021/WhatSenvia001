const CACHE_NAME = "clicksend-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Push notification received
self.addEventListener("push", (event) => {
  let data = { title: "ClickSend", body: "Tienes una nueva notificación", type: "default" };

  try {
    if (event.data) data = event.data.json();
  } catch {}

  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-120.png",
    vibrate: [200, 100, 200, 100, 200],
    tag: data.type || "default",
    renotify: true,
    requireInteraction: data.type === "new_chat",
    data: {
      type: data.type,
      url: data.url || "/dashboard",
    },
    actions: [],
  };

  if (data.type === "new_chat") {
    options.actions = [
      { action: "open-chat", title: "Abrir chat" },
      { action: "dismiss", title: "Cerrar" },
    ];
    options.data.url = "/chat-live";
  } else if (data.type === "campaign_completed" || data.type === "campaign_failed") {
    options.data.url = "/campaigns";
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, options),
      // Update app icon badge
      self.navigator && self.navigator.setAppBadge
        ? self.navigator.setAppBadge().catch(() => {})
        : Promise.resolve(),
    ])
  );
});

// Notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// Clear badge when app is focused
self.addEventListener("notificationclose", (event) => {
  // Badge will be updated by the frontend when it loads
});
