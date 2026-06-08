const ASSET_VERSION = "20260608-2";
const CACHE_NAME = `cashcontrol-static-v5-${ASSET_VERSION}`;
// Deze service worker hoort bij de echte CashControl PWA-build. De root-level
// service-worker.js is alleen cleanup voor oude Live Server/rootregistraties.
// Alle precache assets krijgen dezelfde queryversie als de HTML. Daardoor haalt
// Chrome na een update niet per ongeluk oude JS/CSS uit een vorige cache.
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
      // De app shell bevat alle pagina's en basis-assets die offline nodig zijn.
      return cache.addAll(APP_SHELL);
    })
  );
  // Nieuwe service worker wordt meteen actief zodra hij klaar is met installeren.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // Oude CashControl caches worden verwijderd zodat manifest/JS-fixes niet
      // blijven hangen na een nieuwe build.
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
    // POST/PUT/etc. worden nooit gecachet. De app gebruikt ze nu niet, maar dit
    // voorkomt fout gedrag als er later formulieren of APIs bijkomen.
    return;
  }

  if (url.hostname === "api.frankfurter.dev") {
    // Wisselkoersen moeten live of via onze eigen LocalStorage fallback lopen.
    // Mislukte API-responses horen niet in de service-worker cache.
    return;
  }

  if (url.origin !== self.location.origin) {
    // Alleen eigen app-assets worden gecachet. Externe requests mogen hun eigen
    // browser/networkregels volgen en blijven daardoor makkelijker te debuggen.
    return;
  }

  event.respondWith(
    fetch(request)
        .then((response) => {
          if (response && response.ok) {
            // Network-first: online krijgt de gebruiker altijd de nieuwste files.
            // De succesvolle response wordt daarna bewaard voor offline gebruik.
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            // Offline fallback voor eerder bezochte pagina's/assets.
            return cachedResponse;
          }
          if (request.mode === "navigate") {
            // Wanneer een HTML-pagina nog niet in cache zit, openen we offline
            // alsnog het dashboard in plaats van een kale browserfout.
            return caches.match("./index.html");
          }
          return new Response("", { status: 504, statusText: "Offline" });
        }))
  );
});
