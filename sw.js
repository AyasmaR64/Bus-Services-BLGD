const CACHE_NAME = "bus-balangoda-v1";
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

// Install Event: Cache all essential assets using STATIC_ASSETS
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches and claim clients properly
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

// Fetch Event: Handle Range requests for PMTiles and Cache-First for static assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Special handler for PMTiles and Range requests
  if (event.request.headers.has("range") || url.pathname.endsWith(".pmtiles")) {
    event.respondWith(handleRangeRequest(event.request));
    return;
  }

  // Standard Cache-First strategy for all other app assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          // Fallback response for offline navigation if needed
        });
    }),
  );
});

// Helper function to serve partial content (206) from cached ArrayBuffer for PMTiles
async function handleRangeRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request, { ignoreSearch: true });

  if (!cachedResponse) {
    try {
      const networkResponse = await fetch(request);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    } catch (err) {
      return new Response("Offline and asset not cached", { status: 404 });
    }
  }

  const rangeHeader = request.headers.get("range");
  if (!rangeHeader) {
    return cachedResponse;
  }

  const arrayBuffer = await cachedResponse.arrayBuffer();
  const bytesRange = rangeHeader.replace(/bytes=/, "").split("-");
  const start = parseInt(bytesRange[0], 10);
  const end = bytesRange[1]
    ? parseInt(bytesRange[1], 10)
    : arrayBuffer.byteLength - 1;
  const chunk = arrayBuffer.slice(start, end + 1);

  return new Response(chunk, {
    status: 206,
    statusText: "Partial Content",
    headers: cachedResponse.headers,
  });
}
