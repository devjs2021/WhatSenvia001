const CACHE_NAME = "clicksend-v1";

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

  const iconMap = {
    new_chat: "/icons/icon-192.png",
    campaign_completed: "/icons/icon-192.png",
    campaign_failed: "/icons/icon-192.png",
    campaign_scheduled: "/icons/icon-192.png",
    system_error: "/icons/icon-192.png",
  };

  const options = {
    body: data.body || "",
    icon: iconMap[data.type] || "/icons/icon-192.png",
    badge: "/icons/icon-120.png",
    vibrate: [200, 100, 200],
    tag: data.type || "default",
    renotify: true,
    data: {
      type: data.type,
      url: data.url || "/dashboard",
    },
    actions: [],
  };

  if (data.type === "new_chat") {
    options.actions = [
      { action: "open-chat", title: "Abrir chat" },
    ];
    options.data.url = "/chat-live";
  } else if (data.type === "campaign_completed" || data.type === "campaign_failed") {
    options.data.url = "/campaigns";
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

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
