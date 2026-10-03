/* WagStays service worker — web push + a minimal offline fallback.
 *
 * Caching policy (deliberately small and safe):
 *  - Precache only the static /offline page and the app icons.
 *  - Navigations are network-first and are NEVER written to the cache (pages can be personalised / authenticated);
 *    if the network fails we show the cached /offline page.
 *  - Everything else (API routes, server actions, RSC payloads, _next assets, images) is left to the browser.
 */

// Bump the version when /offline or the icons change so clients re-download them.
const CACHE = "wagstays-shell-v1";
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: "reload", credentials: "omit" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("wagstays-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Full page navigations: network-first, offline page as fallback. Never cached.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => (await caches.match(OFFLINE_URL)) || new Response("You're offline.", { status: 503, headers: { "Content-Type": "text/plain" } })),
    );
    return;
  }

  // App icons: cache-first (static, public).
  if (url.pathname === "/icon-192.png" || url.pathname === "/icon-512.png") {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "WagStays";
  const url = typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || undefined,
      renotify: !!data.tag,
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (wins) => {
      // Prefer a tab already on that page, then any WagStays tab (navigate it), else open a new window.
      const exact = wins.find((w) => w.url === target);
      if (exact) return exact.focus();
      const any = wins.find((w) => new URL(w.url).origin === self.location.origin);
      if (any) {
        await any.focus();
        return any.navigate ? any.navigate(target) : self.clients.openWindow(target);
      }
      return self.clients.openWindow(target);
    }),
  );
});
