const CACHE_NAME = "apex-fit-v2";
// Exercise photos/gifs, filled on purpose by the app (lib/mediaCache.ts), not
// opportunistically: cross-origin <img> requests are no-cors, and caching those
// opaque responses inflates the storage quota far beyond their real size.
const MEDIA_CACHE = "apex-fit-media-v1";
const MEDIA_HOSTS = ["cdn.jsdelivr.net"];
const STATIC_ASSETS = [
  "/_next/static",
  "/fonts",
  "/favicon.ico",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/apple-icon-180x180.png",
];

// Today this worker doubles as the offline fallback for API reads (the
// routine, logs...): the app itself only writes those to Dexie, it doesn't
// read them back when the network fails. Once every offline read goes through
// Dexie, set this to false and the worker stops storing API responses at all
// (they then go straight to the network). Until then: only successful GETs are
// kept, and every cache is wiped on logout (see lib/mediaCache.ts).
const CACHE_API_RESPONSES = true;

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME));
});

// Drop caches from older versions (v1 kept every response it ever saw).
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_NAME && name !== MEDIA_CACHE)
            .map((name) => caches.delete(name)),
        ),
      ),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // Writes (POST/PATCH/...) are never cached; let the browser handle them.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (MEDIA_HOSTS.includes(url.hostname)) {
    event.respondWith(mediaFirst(request));
  } else if (STATIC_ASSETS.some((path) => url.pathname.startsWith(path))) {
    event.respondWith(cacheFirst(request));
  } else if (isApiRequest(url) && !CACHE_API_RESPONSES) {
    return;
  } else {
    event.respondWith(networkFirst(event));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  return cached ?? fetch(request);
}

async function mediaFirst(request) {
  const cached = await caches.match(request, { cacheName: MEDIA_CACHE });
  return cached ?? fetch(request);
}

async function networkFirst(event) {
  const request = event.request;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(request, copy))
          .catch(() => {}),
      );
    }
    return response;
  } catch {
    const cached = await caches.match(request, { cacheName: CACHE_NAME });
    return cached ?? Response.error();
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
