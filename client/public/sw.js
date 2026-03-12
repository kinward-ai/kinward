// Kinward Service Worker — v0.1.0
// Caches app shell for fast loading. Chat requires the local server.

const CACHE_NAME = "kinward-v0.1.0";
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
];

// Install — cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS).catch((err) => {
        console.warn("[sw] Some assets failed to cache:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network-first for API, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API calls or WebSocket
  if (url.pathname.startsWith("/api") || url.pathname === "/ws") {
    return;
  }

  // SSE streams — don't cache
  if (request.headers.get("accept")?.includes("text/event-stream")) {
    return;
  }

  // Static assets — try cache first, fall back to network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Cache successful responses for next time
        if (response.ok && request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback — return cached index for navigation requests
      if (request.mode === "navigate") {
        return caches.match("/index.html");
      }
    })
  );
});
