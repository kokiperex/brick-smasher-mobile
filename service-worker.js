(function configureOfflineCache(worker) {
  "use strict";

  const CACHE_PREFIX = "neon-breaker-static-";
  const CACHE_VERSION = "v2";
  const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
  const PRECACHE_PATHS = Object.freeze([
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./css/styles.css",
    "./assets/icons/icon-192.png",
    "./assets/icons/icon-512.png",
    "./assets/icons/icon-512-maskable.png",
    "./js/ball.js",
    "./js/paddle.js",
    "./js/brick.js",
    "./js/effect-catalog.js",
    "./js/falling-item.js",
    "./js/falling-object-system.js",
    "./js/projectile.js",
    "./js/collision-system.js",
    "./js/levels.js",
    "./js/level-manager.js",
    "./js/input-manager.js",
    "./js/effect-manager.js",
    "./js/audio-manager.js",
    "./js/vibration-manager.js",
    "./js/storage-manager.js",
    "./js/game-loop.js",
    "./js/game.js",
    "./js/main.js",
  ]);
  const resolveFromScope = (relativePath) => new URL(
    relativePath,
    worker.registration.scope,
  ).href;
  const APP_SHELL_URL = resolveFromScope("./index.html");
  const PRECACHE_URLS = PRECACHE_PATHS.map(resolveFromScope);
  const PRECACHE_URL_SET = new Set(PRECACHE_URLS);

  function getCacheKey(url) {
    const cacheKey = new URL(url);
    cacheKey.search = "";
    cacheKey.hash = "";
    return cacheKey.href;
  }

  worker.addEventListener("install", (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
    );
  });

  worker.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => (
            cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME
          ))
          .map((cacheName) => caches.delete(cacheName)),
      )).then(() => worker.clients.claim()),
    );
  });

  worker.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET" || request.destination === "audio") {
      return;
    }
    const requestUrl = new URL(request.url);
    if (requestUrl.origin !== worker.location.origin) {
      return;
    }
    const cacheKey = getCacheKey(request.url);
    const isPrecachedRequest = PRECACHE_URL_SET.has(cacheKey);
    const isAppNavigation = request.mode === "navigate"
      && requestUrl.href.startsWith(worker.registration.scope);
    if (!isPrecachedRequest && !isAppNavigation) {
      return;
    }

    event.respondWith(
      (isPrecachedRequest ? caches.match(cacheKey) : Promise.resolve())
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).catch(() => {
            if (isAppNavigation) {
              return caches.match(APP_SHELL_URL);
            }
            return Response.error();
          });
        }),
    );
  });
})(self);
