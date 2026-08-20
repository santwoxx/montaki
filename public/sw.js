const CACHE_NAME = "montaki-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pré-cache vazio por enquanto
      return cache.addAll([]);
    })
  );
  self.skipWaiting();
});

