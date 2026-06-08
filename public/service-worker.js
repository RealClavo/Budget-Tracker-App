const CACHE_NAME = "cashcontrol-static-v4";
const APP_SHELL = [
  "./",
  "./index.html",
  "./add.html",
  "./overview.html",
  "./calculator.html",
  "./statistics.html",
  "./converter.html",
  "./settings.html",
  "./css/themes.css",
  "./css/style.css",
  "./js/storage.js",
  "./js/theme.js",
  "./js/calculations.js",
  "./js/budget.js",
  "./js/transactions.js",
  "./js/statistics.js",
  "./js/currency.js",
  "./js/i18n.js",
  "./js/settings.js",
  "./js/pwa.js",
  "./js/app.js",
  "./i18n/nl.json",
  "./i18n/en.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./screenshots/cashcontrol-wide.png",
  "./screenshots/cashcontrol-mobile.png",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith("cashcontrol-") && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (url.hostname === "api.frankfurter.dev") {
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkResponse = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return new Response("", { status: 504, statusText: "Offline" });
        });

      return cachedResponse || networkResponse;
    })
  );
});
