const CACHE_NAME = "Buses-BLGD-v1";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./images/icon.png",
  "./images/bus.png",
  "./images/map.png",
  "./images/saved.png",
  "./images/settings.svg",
  "./images/hero.png",
  "./style.json",
  "./balangoda.pmtiles",
  "./sw.js",
  "./lib/maplibre-gl.js",
  "./lib/maplibre-gl.css",
  "./lib/pmtiles.js",
  "./images/map.png",
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
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.headers.has("range")) {
    event.respondWith(handleRangeRequest(request));
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(request).catch(() => {
        return new Response("Offline resource unavailable", { status: 503 });
      });
    }),
  );
});

async function handleRangeRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  let cachedResponse = await cache.match(request, { ignoreSearch: true });

  if (!cachedResponse) {
    try {
      cachedResponse = await fetch(request);
    } catch (e) {
      return new Response("", {
        status: 404,
        statusText: "Offline File Not Found",
      });
    }
  }

  const arrayBuffer = await cachedResponse.arrayBuffer();
  const rangeHeader = request.headers.get("range");
  const match = rangeHeader.match(/bytes=(\d+)-(\d+)?/);

  if (!match) {
    return new Response(arrayBuffer, {
      status: 200,
      headers: cachedResponse.headers,
    });
  }

  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : arrayBuffer.byteLength - 1;
  const slicedBuffer = arrayBuffer.slice(start, end + 1);

  return new Response(slicedBuffer, {
    status: 206,
    statusText: "Partial Content",
    headers: new Headers({
      "Content-Type":
        cachedResponse.headers.get("Content-Type") ||
        "application/octet-stream",
      "Content-Range": `bytes ${start}-${end}/${arrayBuffer.byteLength}`,
      "Content-Length": slicedBuffer.byteLength,
      "Accept-Ranges": "bytes",
    }),
  });
}
