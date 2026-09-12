const CACHE_NAME = "apex-fit-v1";
const STATIC_ASSETS = [
  "/_next/static",
  "/fonts",
  "/favicon.ico",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/apple-icon-180x180.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (STATIC_ASSETS.some((path) => url.pathname.startsWith(path))) {
    event.respondWith(cacheFirst(event.request));
  } else {
    event.respondWith(networkFirst(event.request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  return cached ?? fetch(request);
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    return caches.match(request);
  }
}

// --- Web Push --------------------------------------------------------------

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Apex Fit", {
      body: data.body || "",
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    }),
  );
});

// A push service can invalidate a subscription (key rotation, expiry) and
// ask the browser to get a new one. Without this listener the old
// subscription just silently stops receiving pushes -- nothing on the server
// finds out until a send fails with 404/410, which may be a long time.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const oldEndpoint = event.oldSubscription && event.oldSubscription.endpoint;
      const applicationServerKey =
        (event.oldSubscription && event.oldSubscription.options
          ? event.oldSubscription.options.applicationServerKey
          : null) || (event.newSubscription && event.newSubscription.options
          ? event.newSubscription.options.applicationServerKey
          : null);

      const subscription =
        event.newSubscription ||
        (await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        }));

      const clientsList = await self.clients.matchAll({ type: "window" });
      for (const client of clientsList) {
        client.postMessage({ type: "push-subscription-changed", oldEndpoint, subscription: subscription.toJSON() });
      }
    })(),
  );
});
