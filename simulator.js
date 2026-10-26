// --- Route & Bus Stop Setup ---
const routeCoordinates = [
  [80.701561, 6.650622], // Start: Balangoda Central
  [80.705, 6.652],
  [80.71, 6.6545], // Stop 1: Temple Junction
  [80.716, 6.655],
  [80.722, 6.6525], // Stop 2: Green Valley Stop
  [80.728, 6.651],
  [80.733, 6.6535], // Stop 3: Clock Tower Square
  [80.74, 6.656], // End: Regional Terminal
];

const busHalts = [
  { name: "Balangoda Central Terminal", coords: [80.701561, 6.650622] },
  { name: "Temple Junction Stop", coords: [80.71, 6.6545] },
  { name: "Green Valley Stop", coords: [80.722, 6.6525] },
  { name: "Clock Tower Square", coords: [80.733, 6.6535] },
  { name: "Regional Bus Terminal", coords: [80.74, 6.656] },
];

// Simulation Variables
let animationDistance = 0;
let isAnimating = true;
let animFrameId = null;
const speedKmH = 40; // Speed of bus in simulation
const routeLine = turf.lineString(routeCoordinates);
const totalRouteLength = turf.length(routeLine, { units: "kilometers" });

let currentActiveStopIndex = -1;
let activePopup = new maplibregl.Popup({ closeButton: false, offset: 25 });
let simMap = null;

// --- Custom 3D Bus Layer with Three.js ---
function create3DBusLayer() {
  return {
    id: "3d-bus-layer",
    type: "custom",
    renderingMode: "3d",

    onAdd: function (map, gl) {
      this.camera = new THREE.Camera();
      this.scene = new THREE.Scene();

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
      this.scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(50, 100, 50);
      this.scene.add(dirLight);

      // Create 3D Procedural Bus Mesh
      const busGroup = new THREE.Group();

      // Bus Main Chassis
      const bodyGeo = new THREE.BoxGeometry(2.4, 8, 3);
      const bodyMat = new THREE.MeshLambertMaterial({ color: 0xd97706 }); // Bus Orange/Yellow
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.z = 1.8;
      busGroup.add(body);

      // Bus Roof
      const roofGeo = new THREE.BoxGeometry(2.35, 7.9, 0.3);
      const roofMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.z = 3.3;
      busGroup.add(roof);

      // Bus Windows (Front / Sides)
      const windowMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
      const frontWindow = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.2, 1.2),
        windowMat,
      );
      frontWindow.position.set(0, 3.9, 2.2);
      busGroup.add(frontWindow);

      // Wheels
      const wheelGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.4, 16);
      const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
      wheelGeo.rotateZ(Math.PI / 2);

      const wPositions = [
        [-1.2, 2.2, 0.6],
        [1.2, 2.2, 0.6],
        [-1.2, -2.2, 0.6],
        [1.2, -2.2, 0.6],
      ];

      wPositions.forEach((pos) => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(...pos);
        busGroup.add(wheel);
      });

      this.busMesh = busGroup;
      this.scene.add(this.busMesh);
      this.map = map;

      this.renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true,
      });
      this.renderer.autoClear = false;
    },

    render: function (gl, matrix) {
      if (!this.busMesh) return;

      // Sample position and bearing along line using Turf
      const currentPt = turf.along(routeLine, animationDistance, {
        units: "kilometers",
      });
      const coords = currentPt.geometry.coordinates;

      // Calculate bearing (angle) facing direction
      const nextPt = turf.along(
        routeLine,
        Math.min(animationDistance + 0.02, totalRouteLength),
        { units: "kilometers" },
      );
      const bearing = turf.bearing(currentPt, nextPt);

      // Convert map Lng/Lat to Mercator Coordinates
      const modelMercator = maplibregl.MercatorCoordinate.fromLngLat(coords, 0);
      const scale = modelMercator.meterInMercatorCoordinateUnits();

      // Matrix Transformations for Three.js Scene Camera
      const m = new THREE.Matrix4().fromArray(matrix);
      const l = new THREE.Matrix4()
        .makeTranslation(modelMercator.x, modelMercator.y, modelMercator.z)
        .scale(new THREE.Vector3(scale, -scale, scale))
        .multiply(
          new THREE.Matrix4().makeRotationZ(((bearing + 180) * Math.PI) / 180),
        );

      this.camera.projectionMatrix = m.multiply(l);
      this.renderer.resetState();
      this.renderer.render(this.scene, this.camera);
      this.map.triggerRepaint();

      // Update UI HUD & Bus Stops Checking
      updateSimulatorProgress(coords, bearing);
    },
  };
}

// --- Map Initialization & Stop Layers ---
fetch("./style.json")
  .then((res) => res.json())
  .then((style) => {
    const pmtilesUrl = new URL("balangoda.pmtiles", window.location.href).href;
    if (style.sources && style.sources["versatiles-shortbread"]) {
      style.sources["versatiles-shortbread"] = {
        type: "vector",
        url: "pmtiles://" + pmtilesUrl,
      };
    }

    simMap = new maplibregl.Map({
      container: "sim-map",
      style: style,
      center: routeCoordinates[0],
      zoom: 14,
      pitch: 55, // Pitch for 3D perspective
      bearing: -20,
    });

    simMap.on("style.load", () => {
      // Add Route Source & Line Layer
      simMap.addSource("route", {
        type: "geojson",
        data: routeLine,
      });

      simMap.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#2563eb",
          "line-width": 6,
          "line-opacity": 0.8,
        },
      });

      // Add Bus Stops Source & Layer
      const stopsGeoJSON = {
        type: "FeatureCollection",
        features: busHalts.map((stop, idx) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: stop.coords },
          properties: { name: stop.name, index: idx },
        })),
      };

      simMap.addSource("bus-stops", { type: "geojson", data: stopsGeoJSON });

      // Outer Glowing Circle Layer for Stops
      simMap.addLayer({
        id: "bus-stops-glow",
        type: "circle",
        source: "bus-stops",
        paint: {
          "circle-radius": 10,
          "circle-color": "#ef4444",
          "circle-opacity": 0.3,
        },
      });

      // Core Circle Point Layer
      simMap.addLayer({
        id: "bus-stops-core",
        type: "circle",
        source: "bus-stops",
        paint: {
          "circle-radius": 6,
          "circle-color": "#dc2626",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Add 3D Bus Layer
      simMap.addLayer(create3DBusLayer());

      // Start Animation Loop
      startSimulation();
    });
  })
  .catch((err) => console.error("Error loading style for simulator map:", err));

// --- Animation Loop ---
let lastTimestamp = null;

function animate(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const deltaTime = (timestamp - lastTimestamp) / 1000; // seconds
  lastTimestamp = timestamp;

  if (isAnimating) {
    const distanceStep = (speedKmH / 3600) * deltaTime;
    animationDistance += distanceStep;

    if (animationDistance >= totalRouteLength) {
      animationDistance = 0; // Loop simulation
    }

    if (simMap) {
      simMap.triggerRepaint();
    }
  }

  animFrameId = requestAnimationFrame(animate);
}

function startSimulation() {
  if (!animFrameId) {
    lastTimestamp = null;
    animFrameId = requestAnimationFrame(animate);
  }
}

// --- Update UI HUD & Passing Bus Stops ---
function updateSimulatorProgress(currentBusCoords, bearing) {
  const progressPct = Math.min(
    (animationDistance / totalRouteLength) * 100,
    100,
  );

  const progressBar = document.getElementById("routeProgressBar");
  const progressPctEl = document.getElementById("routeProgressPct");
  if (progressBar) progressBar.style.width = `${progressPct.toFixed(1)}%`;
  if (progressPctEl) progressPctEl.textContent = `${Math.round(progressPct)}%`;

  // Camera Follows Bus Position
  if (simMap) {
    simMap.easeTo({
      center: currentBusCoords,
      bearing: bearing,
      duration: 0,
      easing: (t) => t,
    });
  }

  // Check proximity to Bus Stops
  busHalts.forEach((stop, idx) => {
    const distanceToStop = turf.distance(
      turf.point(currentBusCoords),
      turf.point(stop.coords),
      { units: "kilometers" },
    );

    // If bus is within 100 meters (0.1 km) of a bus stop
    if (distanceToStop < 0.1) {
      if (currentActiveStopIndex !== idx) {
        currentActiveStopIndex = idx;

        // Display Popup over passing stop
        activePopup
          .setLngLat(stop.coords)
          .setHTML(`🚌 Passing: <strong>${stop.name}</strong>`)
          .addTo(simMap);

        const passingStopEl = document.getElementById("currentPassingStop");
        if (passingStopEl) passingStopEl.textContent = `Passing: ${stop.name}`;

        const nextStopNameEl = document.getElementById("nextStopName");
        if (nextStopNameEl) {
          const nextStop = busStops[idx + 1]
            ? busStops[idx + 1].name
            : "Route Completed";
          nextStopNameEl.textContent = nextStop;
        }
      }
    }
  });
}

// --- UI Controls ---
const toggleBtn = document.getElementById("toggleSimBtn");
if (toggleBtn) {
  toggleBtn.addEventListener("click", () => {
    isAnimating = !isAnimating;
    toggleBtn.textContent = isAnimating
      ? "Pause Simulation"
      : "Resume Simulation";
    toggleBtn.className = isAnimating ? "btn btn-primary" : "btn btn-secondary";
    const busStatusEl = document.getElementById("busStatus");
    if (busStatusEl) {
      busStatusEl.textContent = isAnimating ? "On Route" : "Paused";
      busStatusEl.className = isAnimating
        ? "hud-value status-moving"
        : "hud-value";
    }
  });
}

const resetSimBtn = document.getElementById("resetSimBtn");
if (resetSimBtn) {
  resetSimBtn.addEventListener("click", () => {
    animationDistance = 0;
    currentActiveStopIndex = -1;
    if (activePopup) activePopup.remove();
    const passingStopEl = document.getElementById("currentPassingStop");
    if (passingStopEl)
      passingStopEl.textContent = `Passing: ${busStops[0].name}`;
    const nextStopNameEl = document.getElementById("nextStopName");
    if (nextStopNameEl) nextStopNameEl.textContent = busStops[1].name;
  });
}
