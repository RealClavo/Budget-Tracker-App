const ASSET_VERSION = "20260608-2";
const CACHE_NAME = `cashcontrol-static-v5-${ASSET_VERSION}`;
const versioned = (path) => `${path}?v=${ASSET_VERSION}`;
const APP_SHELL = [
  "./",
  "./index.html",
  "./add.html",
  "./overview.html",
  "./calculator.html",
  "./statistics.html",
  "./converter.html",
  "./settings.html",
  versioned("./css/themes.css"),
  versioned("./css/style.css"),
  versioned("./js/storage.js"),
  versioned("./js/theme.js"),
  versioned("./js/calculations.js"),
  versioned("./js/budget.js"),
  versioned("./js/transactions.js"),
  versioned("./js/statistics.js"),
  versioned("./js/currency.js"),
  versioned("./js/i18n.js"),
  versioned("./js/settings.js"),
  versioned("./js/pwa.js"),
  versioned("./js/app.js"),
  versioned("./i18n/nl.json"),
  versioned("./i18n/en.json"),
  versioned("./icons/icon-192.png"),
  versioned("./icons/icon-512.png"),
  versioned("./icons/icon-maskable-192.png"),
  versioned("./icons/icon-maskable-512.png"),
  versioned("./screenshots/cashcontrol-wide.png"),
  versioned("./screenshots/cashcontrol-mobile.png"),
  versioned("./manifest.json")
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
    fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return new Response("", { status: 504, statusText: "Offline" });
        }))
  );
});
