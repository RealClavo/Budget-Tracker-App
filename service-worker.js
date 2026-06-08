const CACHE_NAME = "cashcontrol-root-cleanup-v2";

// Deze file staat bewust in de project-root omdat browsers eerder op deze plek
// een service worker konden registreren via Live Server. Hij ruimt alleen op en
// schrijft geen nieuwe app-cache.
self.addEventListener("install", () => {
  // Deze root worker bestaat alleen voor Live Server/root-cache cleanup.
  // De echte PWA service worker draait vanuit public/docs.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      // Oude root-level caches opruimen, daarna unregisteren zodat deze cleanup
      // worker zichzelf niet als permanente PWA worker gedraagt.
      .then((cacheNames) => Promise.all(cacheNames.filter((name) => name.startsWith("cashcontrol-")).map((name) => caches.delete(name))))
      .then(() => self.registration.unregister())
  );
});
