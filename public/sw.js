/* Offline shell + cached checklist. Live prices are never served from cache. */
const VERSION = "aw-v1";
const SHELL = ["/", "/checklist", "/offline", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL).catch(() => undefined)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const NEVER_CACHE = [/\/api\/products/, /\/api\/stores/, /\/api\/offers/, /\/api\/agent/, /\/api\/location/, /\/api\/basket\/optimise/, /\/auth\//];

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER_CACHE.some((re) => re.test(url.pathname))) return; // network only: prices must be live

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(caches.open(VERSION).then(async (c) => (await c.match(request)) || fetch(request).then((res) => { c.put(request, res.clone()); return res; })));
    return;
  }

  // Checklist API + pages: network first, fall back to last good copy.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && (url.pathname === "/api/checklist" || request.mode === "navigate")) caches.open(VERSION).then((c) => c.put(request, res.clone()));
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") return (await caches.match("/offline")) || new Response("Offline", { status: 503 });
        return new Response(JSON.stringify({ error: "You're offline. Reconnect to check current prices." }), { status: 503, headers: { "Content-Type": "application/json" } });
      }),
  );
});
