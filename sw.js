const CACHE_VERSION = "decision-os-v3";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./alchemist.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

/* =========================
   INSTALL
========================= */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/* =========================
   ACTIVATE
========================= */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (!key.startsWith(CACHE_VERSION)) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

/* =========================
   FETCH STRATEGY
========================= */
self.addEventListener("fetch", (event) => {

  const request = event.request;
  const url = new URL(request.url);

  // Skip chrome extensions
  if (!request.url.startsWith("http")) return;

  // Wikipedia API → Network First
  if (url.hostname.includes("wikipedia.org") ||
      url.hostname.includes("wikivoyage.org") ||
      url.hostname.includes("wikibooks.org") ||
      url.hostname.includes("wikinews.org")) {

    event.respondWith(
      fetch(request)
        .then(res => {
          return caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, res.clone());
            return res;
          });
        })
        .catch(() => caches.match(request))
    );

    return;
  }

  // Static Assets → Cache First
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(res => {
        return caches.open(DYNAMIC_CACHE).then(cache => {
          cache.put(request, res.clone());
          return res;
        });
      });
    })
  );
});
