const CACHE_NAME = "cashcontrol-root-cleanup-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => Promise.all(cacheNames.filter((name) => name.startsWith("cashcontrol-")).map((name) => caches.delete(name))))
      .then(() => self.registration.unregister())
  );
});
