const CACHE = "qesuite-re-shell-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// The first visit's modules loaded before this worker took control.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "PREPARE_OFFLINE" || !Array.isArray(event.data.urls)) return;
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      const urls = [...new Set([...SHELL, ...event.data.urls])].filter((value) => {
        const url = new URL(value, self.location.origin);
        return url.origin === self.location.origin && !url.pathname.startsWith("/api/") && url.pathname !== "/sw.js";
      });
      for (const url of urls) {
        if (!(await cache.match(url, { ignoreVary: true }))) await cache.add(url);
      }
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => (key.startsWith("qesuite-re-shell-") || key.startsWith("qesuite-shell-")) && key !== CACHE).map((key) => caches.delete(key)));
      event.ports[0]?.postMessage({ ok: true });
    } catch {
      event.ports[0]?.postMessage({ ok: false });
    }
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  event.respondWith(
    fetch(request)
      .then(async (response) => {
        if (response.ok) {
          const clone = response.clone();
          const cache = await caches.open(CACHE);
          await cache.put(request, clone);
        }
        return response;
      })
      .catch(async () => {
        // Vite varies modules by Origin. All accepted requests here are already
        // same-origin, including modules cached before this worker controlled them.
        const cached = await caches.match(request, { ignoreVary: true });
        if (cached) return cached;
        if (request.mode === "navigate") return (await caches.match("/")) || Response.error();
        return Response.error();
      })
  );
});
