// Register PMTiles Protocol
const protocol = new pmtiles.Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);

// Register Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("sw.js");
      console.log("Service Worker registered.");
    } catch (err) {
      console.error("Service Worker registration failed:", err);
    }
  });
}

const busData = {
  "BL-01": {
    short: "BL-01",
    name: {
      si: "බලංගොඩ-වේලිඔය-හම්බෙගමුව",
      en: "Balangoda - Welioya - Hambegamuwa",
      ta: "பலங்கொடா - வேலியோயா - ஹம்பெகமுவா",
    },
    distance: 34,
    routeNumber: "BL-01",
    down: [
      {
        departure: "Balangoda",
        depTime: "06:00",
        destination: "Welioya",
        endTime: "07:30",
        serviceType: "sltb",
      },
      {
        departure: "Balangoda",
        depTime: "07:30",
        destination: "Welioya",
        endTime: "09:00",
        serviceType: "sltb",
      },
      {
        departure: "Balangoda",
        depTime: "08:30",
        destination: "Welioya",
        endTime: "10:00",
        serviceType: "private",
      },
      {
        departure: "Balangoda",
        depTime: "09:00",
        destination: "Welioya",
        endTime: "10:30",
        serviceType: "sltb",
      },
      {
        departure: "Balangoda",
        depTime: "09:30",
        destination: "Welioya",
        endTime: "11:00",
        serviceType: "private",
      },
      {
        departure: "Balangoda",
        depTime: "13:30",
        destination: "Welioya",
        endTime: "15:00",
        serviceType: "sltb",
      },
    ],
    up: [
      {
        departure: "Welioya",
        depTime: "06:00",
        destination: "Balangoda",
        endTime: "07:30",
        serviceType: "sltb",
      },
      {
        departure: "Welioya",
        depTime: "08:30",
        destination: "Balangoda",
        endTime: "10:00",
        serviceType: "private",
      },
      {
        departure: "Welioya",
        depTime: "13:30",
        destination: "Balangoda",
        endTime: "15:00",
        serviceType: "sltb",
      },
    ],
  },
  "BL-02": {
    short: "BL-02",
    name: {
      si: "බලංගොඩ-වැලිපතයාය-කල්තොට",
      en: "Balangoda - Kaltota",
      ta: "பலங்கொடா - கால்தொட்டா",
    },
    distance: 39,
    routeNumber: "BL-02",
    down: [
      {
        departure: "Balangoda",
        depTime: "07:30",
        destination: "Kaltota",
        endTime: "09:00",
        serviceType: "sltb",
      },
    ],
    up: [
      {
        departure: "Kaltota",
        depTime: "07:30",
        destination: "Balangoda",
        endTime: "09:00",
        serviceType: "sltb",
      },
    ],
  },
  "BL-03": {
    short: "BL-03",
    name: {
      si: "බලංගොඩ-රජවක-මුල්ගම",
      en: "Balangoda - Mulgama",
      ta: "பலங்கොடா - முல்கமா",
    },
    distance: 17,
    routeNumber: "BL-03",
    down: [
      {
        departure: "Balangoda",
        depTime: "08:30",
        destination: "Mulgama",
        endTime: "10:00",
        serviceType: "private",
      },
    ],
    up: [
      {
        departure: "Mulgama",
        depTime: "08:30",
        destination: "Balangoda",
        endTime: "10:00",
        serviceType: "private",
      },
    ],
  },
};

const busStops = {
  Balangoda: 0,
  Kirimatitenna: 3.2,
  Depalamulla: 8.1,
  Bowatta: 10,
  Rajavaka: 12,
  Nawaneliya: 17,
  Molamure: 18,
  Tanjantenna: 22,
  Kaltota: 29,
  Welioya: 34,
};

const balangodaCenter = { lat: 6.661, lng: 80.77 };
let map;
let fromMarker = null,
  toMarker = null,
  userMarker = null,
  simMarker = null;
let mapMode = null;
let simCoords = [],
  simTimer = null,
  simIndex = 0;
let currentResult = null;

const translations = {
  si: {
    route: "බස් මාර්ගය",
    service: "බස් සේවාව",
    from: "ගමනාරමිභය",
    to: "ගමනාන්තය",
    time: "වේලාව",
    search: "සොයන්න",
    result: "ප්‍රතිපල",
    buses: "Buses",
    map: "Map",
    saved: "Saved",
    settings: "Settings",
  },
  ta: {
    route: "வழி",
    service: "சேவை வகை",
    from: "புறப்பாடு",
    to: "இலக்கு",
    time: "நேரம்",
    search: "தேடுக",
    result: "முடிவுகள்",
    buses: "பஸ்கள்",
    map: "வரைபடம்",
    saved: "Saved",
    settings: "Settings",
  },
  en: {
    route: "Route",
    service: "Service",
    from: "From",
    to: "To",
    time: "Time",
    search: "Search",
    result: "Results",
    buses: "Buses",
    map: "Map",
    saved: "Saved",
    settings: "Settings",
  },
};

function haversine(a, b) {
  const R = 6371;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat),
    dLon = toRad(b.lng - a.lng);
  const c =
    2 *
    Math.atan2(
      Math.sqrt(
        Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(a.lat)) *
            Math.cos(toRad(b.lat)) *
            Math.sin(dLon / 2) ** 2,
      ),
      Math.sqrt(1 - Math.sin(dLat / 2) ** 2),
    );
  return R * c;
}

function parseTimeToDate(tStr) {
  const [hh, mm] = tStr.split(":").map(Number);
  const d = new Date();
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d;
}

function initMap(containerId = "map") {
  if (map) return;

  fetch("./style.json")
    .then((res) => res.json())
    .then((style) => {
      const pmtilesUrl = new URL("balangoda.pmtiles", window.location.href)
        .href;
      if (style.sources && style.sources["versatiles-shortbread"]) {
        style.sources["versatiles-shortbread"] = {
          type: "vector",
          url: "pmtiles://" + pmtilesUrl,
        };
      }

      map = new maplibregl.Map({
        container: containerId,
        style: style,
        center: [balangodaCenter.lng, balangodaCenter.lat],
        zoom: 13,
        pitch: 0,
        attributionControl: false,
        hash: true,
      });

      map.addControl(
        new maplibregl.NavigationControl({ visualizePitch: true }),
        "bottom-right",
      );
      map.addControl(
        new maplibregl.ScaleControl({ maxWidth: 100, unit: "metric" }),
        "bottom-left",
      );
      map.addControl(new maplibregl.FullscreenControl(), "top-right");

      map.on("click", (e) => {
        const lngLat = [e.lngLat.lng, e.lngLat.lat];
        if (mapMode === "from") {
          if (fromMarker) fromMarker.remove();
          fromMarker = new maplibregl.Marker({ color: "#3b82f6" })
            .setLngLat(lngLat)
            .addTo(map);
          addCustomStop(
            "fromSelect",
            { lat: e.lngLat.lat, lng: e.lngLat.lng },
            "From (map)",
          );
        } else if (mapMode === "to") {
          if (toMarker) toMarker.remove();
          toMarker = new maplibregl.Marker({ color: "#ef4444" })
            .setLngLat(lngLat)
            .addTo(map);
          addCustomStop(
            "toSelect",
            { lat: e.lngLat.lat, lng: e.lngLat.lng },
            "To (map)",
          );
        }
        setMapMode(null);
      });
    })
    .catch((err) => console.error("Error loading style.json:", err));
}

function moveMapToFull() {
  const full = document.getElementById("map-full");
  if (!map || !full) return;
  if (map.getContainer().parentNode !== full) {
    full.appendChild(map.getContainer());
    setTimeout(() => map.resize(), 200);
  }
}

function setMapMode(mode) {
  mapMode = mode;
  document
    .getElementById("setFromBtn")
    ?.classList.toggle("active", mode === "from");
  document
    .getElementById("setToBtn")
    ?.classList.toggle("active", mode === "to");
}

function addCustomStop(selectId, latlng, labelText) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const val = `CUSTOM_${latlng.lat}_${latlng.lng}`;
  const opt = document.createElement("option");
  opt.value = val;
  opt.textContent = labelText;
  opt.selected = true;
  select.appendChild(opt);
}

function locateUserOnce() {
  if (!navigator.geolocation) return alert("Geolocation not supported");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const coords = [pos.coords.longitude, pos.coords.latitude];
      if (!userMarker) {
        userMarker = new maplibregl.Marker({ color: "#10b981" })
          .setLngLat(coords)
          .addTo(map);
      } else {
        userMarker.setLngLat(coords);
      }
      map.flyTo({ center: coords, zoom: 15 });
    },
    (err) => alert("Location error: " + (err.message || err.code)),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
  );
}

function doFindBus() {
  const routeKey = document.getElementById("routeSelect").value;
  const fromVal = document.getElementById("fromSelect").value;
  const toVal = document.getElementById("toSelect").value;
  const timeInput = document.getElementById("timeInput").value;
  const serviceFilter = document.getElementById("bus-service").value;

  let fromDist = fromVal.startsWith("CUSTOM_")
    ? haversine(balangodaCenter, {
        lat: parseFloat(fromVal.split("_")[1]),
        lng: parseFloat(fromVal.split("_")[2]),
      })
    : busStops[fromVal];
  let toDist = toVal.startsWith("CUSTOM_")
    ? haversine(balangodaCenter, {
        lat: parseFloat(toVal.split("_")[1]),
        lng: parseFloat(toVal.split("_")[2]),
      })
    : busStops[toVal];

  const direction = fromDist > toDist ? "up" : "down";
  const route = busData[routeKey];
  if (!route || !route[direction]) return;

  const compareTime = timeInput ? parseTimeToDate(timeInput) : new Date();

  let arrivals = route[direction].map((b, idx) => {
    const dep = parseTimeToDate(b.depTime);
    const end = parseTimeToDate(b.endTime);
    const tripMs = end - dep;
    const proportion = fromDist / route.distance;
    const arrivalAtFrom = new Date(dep.getTime() + proportion * tripMs);
    const arrivalAtTo = new Date(
      dep.getTime() + (toDist / route.distance) * tripMs,
    );
    return { index: idx, bus: b, arrivalAtFrom, arrivalAtTo };
  });

  if (serviceFilter && serviceFilter !== "normal") {
    arrivals = arrivals.filter((a) => a.bus.serviceType === serviceFilter);
  }

  arrivals.sort((a, b) => a.arrivalAtFrom - b.arrivalAtFrom);
  let foundIndex = arrivals.findIndex((a) => a.arrivalAtFrom >= compareTime);
  if (foundIndex === -1) foundIndex = Math.max(0, arrivals.length - 1);

  currentResult = {
    routeKey,
    fromVal,
    toVal,
    arrivals,
    idx: foundIndex,
    direction,
  };
  renderResult();
}

function renderResult() {
  const resultTitleEl = document.getElementById("resultShort");
  const mainTimeEl = document.getElementById("resultTime");
  const pill = document.getElementById("servicePill");
  const fromNameEl = document.getElementById("fromName");
  const toNameEl = document.getElementById("toName");
  const fromTimeEl = document.getElementById("fromTime");
  const toTimeEl = document.getElementById("toTime");
  const detailsEl = document.getElementById("resultDetails");

  if (!currentResult || currentResult.arrivals.length === 0) {
    resultTitleEl.textContent = "--";
    pill.style.display = "none";
    mainTimeEl.textContent = "--:--";
    detailsEl.innerHTML = "";
    return;
  }
  const route = busData[currentResult.routeKey];
  const item = currentResult.arrivals[currentResult.idx];
  const b = item.bus;

  resultTitleEl.innerHTML = `<span class="route-short">${route.short}</span> &nbsp; ${b.departure} → ${b.destination}`;

  pill.style.display = "inline-block";
  pill.textContent =
    b.serviceType === "sltb"
      ? "SLTB"
      : b.serviceType === "private"
        ? "PRIVATE"
        : b.serviceType.toUpperCase();
  pill.className = `pill ${b.serviceType === "private" ? "private" : "sltb"}`;

  fromNameEl.textContent = currentResult.fromVal;
  toNameEl.textContent = currentResult.toVal;
  fromTimeEl.textContent = item.arrivalAtFrom.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  toTimeEl.textContent = item.arrivalAtTo.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  mainTimeEl.textContent = item.arrivalAtFrom.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const depTime = parseTimeToDate(b.depTime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = parseTimeToDate(b.endTime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  detailsEl.innerHTML = `
    <div><strong>Departure:</strong> ${b.departure} — ${depTime}</div>
    <div><strong>Destination:</strong> ${b.destination} — ${endTime}</div>
    <div><strong>Route:</strong> ${route.routeNumber} &nbsp; <strong>Service:</strong> ${pill.textContent}</div>
    <div><strong>Distance:</strong> ${route.distance} km</div>
  `;
}

function handleGpx(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function () {
    const parser = new DOMParser();
    const xml = parser.parseFromString(reader.result, "application/xml");
    const pts = Array.from(xml.querySelectorAll("trkpt"));
    simCoords = pts.map((p) => [
      parseFloat(p.getAttribute("lon")),
      parseFloat(p.getAttribute("lat")),
    ]);

    if (map.getSource("gpx-route")) {
      map.getSource("gpx-route").setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: simCoords },
      });
    } else {
      map.addSource("gpx-route", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "LineString", coordinates: simCoords },
        },
      });
      map.addLayer({
        id: "gpx-route-layer",
        type: "line",
        source: "gpx-route",
        paint: { "line-color": "#ff6b6b", "line-width": 4 },
      });
    }
  };
  reader.readAsText(file);
}

function startSimulator() {
  if (simCoords.length < 2) return alert("Please select a GPX file first.");
  if (simMarker) simMarker.remove();
  simIndex = 0;

  const el = document.createElement("div");
  el.className = "bus-sim-icon";
  el.innerHTML = "🚌";

  simMarker = new maplibregl.Marker({ element: el })
    .setLngLat(simCoords[0])
    .addTo(map);
  runSimulationStep();
}

function runSimulationStep() {
  if (simIndex >= simCoords.length - 1) return;
  simTimer = setTimeout(() => {
    simIndex++;
    simMarker.setLngLat(simCoords[simIndex]);
    runSimulationStep();
  }, 300);
}

document.addEventListener("DOMContentLoaded", () => {
  initMap("map");

  document.getElementById("searchBtn")?.addEventListener("click", doFindBus);
  document
    .getElementById("setFromBtn")
    ?.addEventListener("click", () => setMapMode("from"));
  document
    .getElementById("setToBtn")
    ?.addEventListener("click", () => setMapMode("to"));
  document
    .getElementById("centerBtn")
    ?.addEventListener("click", locateUserOnce);
  document.getElementById("gpxFile")?.addEventListener("change", handleGpx);
  document
    .getElementById("startSimBtn")
    ?.addEventListener("click", startSimulator);
  document
    .getElementById("stopSimBtn")
    ?.addEventListener("click", () => clearTimeout(simTimer));

  document.getElementById("prevBusBtn")?.addEventListener("click", () => {
    if (currentResult && currentResult.idx > 0) {
      currentResult.idx--;
      renderResult();
    }
  });

  document.getElementById("nextBusBtn")?.addEventListener("click", () => {
    if (
      currentResult &&
      currentResult.idx < currentResult.arrivals.length - 1
    ) {
      currentResult.idx++;
      renderResult();
    }
  });

  const langSelect = document.getElementById("langSelect");
  if (langSelect) {
    langSelect.addEventListener("change", (e) => setLanguage(e.target.value));
    setLanguage(langSelect.value || "si");
  }
});

function setLanguage(lang) {
  const t = translations[lang] || translations.si;
  document.getElementById("label-route").textContent = t.route;
  document.getElementById("label-service").textContent = t.service;
  document.getElementById("label-from").textContent = t.from;
  document.getElementById("label-to").textContent = t.to;
  document.getElementById("label-time").textContent = t.time;
  document.getElementById("searchBtn").textContent = t.search;
  document.getElementById("label-result").textContent = t.result;

  const routeSel = document.getElementById("routeSelect");
  if (routeSel) {
    for (let i = 0; i < routeSel.options.length; i++) {
      const opt = routeSel.options[i];
      if (busData[opt.value]) {
        opt.textContent =
          busData[opt.value].name[lang] || busData[opt.value].name.si;
      }
    }
  }
}

function showPage(pageId, navEl) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  if (navEl) navEl.classList.add("active");

  if (pageId === "map-page" || pageId === "search-page") {
    moveMapToFull();
    setTimeout(() => {
      map && map.resize();
    }, 200);
  }
}
