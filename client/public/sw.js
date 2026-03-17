// Kinward Service Worker — v0.2.0
// Network-first for app assets (always fresh when server is reachable),
// falls back to cache when offline. API calls are never cached.

const CACHE_NAME = "kinward-v0.2.0";
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
];

// Install — cache app shell for offline fallback
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS).catch((err) => {
        console.warn("[sw] Some assets failed to cache:", err);
      });
    })
  );
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

// Activate — clean old caches and take control of all pages
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

// Fetch — network-first for everything, cache as offline fallback
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept API calls or WebSocket — let them pass through
  if (url.pathname.startsWith("/api") || url.pathname === "/ws") {
    return;
  }

  // SSE streams — don't cache
  if (request.headers.get("accept")?.includes("text/event-stream")) {
    return;
  }

  // Network-first: try the server, cache the response, fall back to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful GET responses for offline fallback
        if (response.ok && request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Network failed — serve from cache (offline mode)
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // For navigation requests, fall back to cached index.html
          if (request.mode === "navigate") {
            return caches.match("/index.html");
          }
        });
      })
  );
});
