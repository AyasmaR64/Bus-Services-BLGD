const CACHE_NAME = "Buses-BLGD-v1";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./simulator.js",
  "./manifest.json",
  "./images/icon.png",
  "./images/hero.png",
  "./style.json",
  "./balangoda.pmtiles",
  "./lib/maplibre-gl.css",
  "./lib/maplibre-gl.js",
  "./lib/pmtiles.js",
  "./lib/turf.min.js",
  "./lib/three.min.js",
  "./lib/all.min.css",
  "./assets/font/noto_sans_bold/0-255.pbf",
  "./assets/font/noto_sans_regular/0-255.pbf",
  "./assets/font/noto_sans_regular/1024-1279.pbf",
  "./assets/font/noto_sans_regular/1280-1535.pbf",
  "./assets/font/noto_sans_regular/1536-1791.pbf",
  "./assets/font/noto_sans_regular/1792-2047.pbf",
  "./assets/font/noto_sans_regular/2048-2303.pbf",
  "./assets/font/noto_sans_regular/2304-2559.pbf",
  "./assets/font/noto_sans_regular/256-511.pbf",
  "./assets/font/noto_sans_regular/2560-2815.pbf",
  "./assets/font/noto_sans_regular/2816-3071.pbf",
  "./assets/font/noto_sans_regular/3072-3327.pbf",
  "./assets/font/noto_sans_regular/3328-3583.pbf",
  "./assets/font/noto_sans_regular/3584-3839.pbf",
  "./assets/font/noto_sans_regular/3840-4095.pbf",
  "./assets/font/noto_sans_regular/512-767.pbf",
  "./assets/font/noto_sans_regular/768-1023.pbf",
  "./assets/font/noto_sans_regular/8192-8447.pbf",
  "./assets/font/Open Sans Regular,Arial Unicode MS Regular/0-255.pbf",
  "./assets/font/Open Sans Regular,Arial Unicode MS Regular/8192-8447.pbf",
  "./assets/sprites/index.json",
  "./assets/sprites/basics/sprites.json",
  "./assets/sprites/basics/sprites.png",
  "./assets/sprites/basics/sprites@2x.json",
  "./assets/sprites/basics/sprites@2x.png",
  "./assets/sprites/basics/sprites@3x.json",
  "./assets/sprites/basics/sprites@3x.png",
  "./assets/sprites/basics/sprites@4x.json",
  "./assets/sprites/basics/sprites@4x.png",
  "./assets/sprites/markers/sprites.json",
  "./assets/sprites/markers/sprites.png",
  "./assets/sprites/markers/sprites@2x.json",
  "./assets/sprites/markers/sprites@2x.png",
  "./assets/sprites/markers/sprites@3x.json",
  "./assets/sprites/markers/sprites@3x.png",
  "./assets/sprites/markers/sprites@4x.json",
  "./assets/sprites/markers/sprites@4x.png",
];
// Install Event: Cache all critical static and map assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting()),
  );
});

// Activate Event: Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch Event: Serve cached assets when offline
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Fallback to index.html for navigation requests if offline
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
      });
    }),
  );
});
