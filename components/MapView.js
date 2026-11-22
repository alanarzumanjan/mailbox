/**
 * Интерактивная карта Риги на базе Leaflet: запрашивает GPS-позицию пользователя,
 * отрисовывает маркеры ящиков и прокладывает реальный маршрут по дорогам через OSRM.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { getBoxStatus, getBoxPercent } from "@/data/initialBoxes";

const DEFAULT_POS = { lat: 56.9515, lng: 24.112 };

// Несколько OSRM-серверов: если один недоступен, пробуем следующий
const ROUTING_SERVERS = [
  "https://routing.openstreetmap.de/routed-car/route/v1/driving",
  "https://router.project-osrm.org/route/v1/driving",
];

async function fetchRoadRoute(coordsString, signal) {
  let lastError;
  for (const server of ROUTING_SERVERS) {
    try {
      const res = await fetch(
        `${server}/${coordsString}?overview=full&geometries=geojson`,
        { signal },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.code === "Ok" && data.routes?.length > 0) return data.routes[0];
      throw new Error(data.code || "No route");
    } catch (err) {
      if (err.name === "AbortError") throw err;
      lastError = err;
    }
  }
  throw lastError;
}

// Расстояние по прямой (км) — только для запасного варианта
function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function MapView({
  boxes,
  selectedId,
  onSelectBox,
  routePoints,
  routeActive,
  onDistanceCalculated,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef(new Map());
  const userMarkerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const routePointsRef = useRef(routePoints);
  const onDistanceRef = useRef(onDistanceCalculated);

  const [userPos, setUserPos] = useState(DEFAULT_POS);
  const [hasRealPos, setHasRealPos] = useState(false);

  // Всегда держим свежие значения в ref, чтобы не перезапускать эффекты зря
  useEffect(() => {
    routePointsRef.current = routePoints;
    onDistanceRef.current = onDistanceCalculated;
  });
  // Ключ маршрута: меняется только когда реально изменился набор точек
  const routeKey = routePoints
    .map((b) => `${b.id}:${b.lat.toFixed(5)},${b.lng.toFixed(5)}`)
    .join("|");

  // 1. Создание карты
  useEffect(() => {
    if (mapInstanceRef.current || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([DEFAULT_POS.lat, DEFAULT_POS.lng], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current.clear();
      userMarkerRef.current = null;
      routeLayerRef.current = null;
    };
  }, []);

  // 2. Геолокация (отдельно от карты, с защитой от уничтоженной карты)
  useEffect(() => {
    if (!navigator.geolocation) return;
    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled || !mapInstanceRef.current) return;
        setUserPos({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setHasRealPos(true);
      },
      () => console.log("Geolocation permission denied or unavailable"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  // 3. Маркер пользователя + центрирование (один раз, когда получили позицию)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !hasRealPos) return;

    map.setView([userPos.lat, userPos.lng], 14);

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userPos.lat, userPos.lng]);
      return;
    }

    const userIcon = L.divIcon({
      className: "",
      html: `<div style="background:#2563eb; width:16px; height:16px; border:3px solid white; border-radius:50%; box-shadow:0 0 10px rgba(37,99,235,0.5);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    userMarkerRef.current = L.marker([userPos.lat, userPos.lng], {
      icon: userIcon,
    }).addTo(map);
    userMarkerRef.current.bindTooltip("Your location", { direction: "top" });
  }, [hasRealPos, userPos]);

  // 4. Маркеры ящиков
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    boxes.forEach((box) => {
      const status = getBoxStatus(box);
      const pct = getBoxPercent(box);
      const isSelected = selectedId === box.id;

      const icon = L.divIcon({
        className: "",
        html: `<div class="post-marker ${status} ${isSelected ? "selected" : ""} ${status === "full" ? "pulse" : ""}">
                 <span>${box.id.slice(-2)}</span>
               </div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 32],
      });

      const marker = L.marker([box.lat, box.lng], { icon }).addTo(map);
      marker.bindTooltip(`${box.name} · ${pct}%`, {
        direction: "top",
        offset: [0, -24],
      });
      marker.on("click", () => onSelectBox(box.id));
      markersRef.current.set(box.id, marker);
    });
  }, [boxes, selectedId, onSelectBox]);

  // 5. Перелёт к выбранному ящику
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedId) return;
    const box = boxes.find((b) => b.id === selectedId);
    if (box) {
      map.flyTo([box.lat, box.lng], Math.max(map.getZoom(), 15), {
        duration: 0.55,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // 6. Реальный маршрут по дорогам
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    const points = routePointsRef.current;
    if (!routeActive || points.length === 0) return;

    let cancelled = false;
    const controller = new AbortController();

    // OSRM принимает координаты в формате lng,lat
    const coordsString = [
      [userPos.lng, userPos.lat],
      ...points.map((b) => [b.lng, b.lat]),
    ]
      .map((c) => c.join(","))
      .join(";");

    const draw = (layer) => {
      if (cancelled || mapInstanceRef.current !== map) return;
      if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = layer.addTo(map);
      map.fitBounds(layer.getBounds().pad(0.25));
    };

    fetchRoadRoute(coordsString, controller.signal)
      .then((route) => {
        if (cancelled) return;
        const latlngs = route.geometry.coordinates.map(([lng, lat]) => [
          lat,
          lng,
        ]);
        onDistanceRef.current?.(Number((route.distance / 1000).toFixed(1)));
        draw(
          L.polyline(latlngs, {
            color: "#0b9b70",
            weight: 5,
            opacity: 0.9,
            lineCap: "round",
            lineJoin: "round",
          }),
        );
      })
      .catch((err) => {
        if (err.name === "AbortError" || cancelled) return;
        console.warn("Routing failed, showing straight-line fallback:", err);

        // Запасной вариант: серая пунктирная линия (видно, что это не дорожный маршрут)
        const chain = [userPos, ...points];
        let km = 0;
        for (let i = 1; i < chain.length; i++) {
          km += haversineKm(chain[i - 1], chain[i]);
        }
        onDistanceRef.current?.(Number((km * 1.3).toFixed(1)));
        draw(
          L.polyline(
            chain.map((p) => [p.lat, p.lng]),
            { color: "#94a3b8", weight: 4, opacity: 0.9, dashArray: "8 8" },
          ),
        );
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [routeKey, routeActive, userPos]);

  return (
    <section className="relative flex-1 min-w-0 bg-slate-100 h-[48vh] md:h-auto min-h-[330px]">
      <div ref={mapContainerRef} className="w-full h-full bg-[#e9eff1]" />

      <div className="absolute top-4 left-4 z-[500] flex flex-col gap-2 pointer-events-none">
        <div className="bg-white/95 backdrop-blur rounded-xl border border-white shadow-lg shadow-slate-900/5 px-4 py-3 pointer-events-auto min-w-[190px]">
          <div className="text-[10px] uppercase tracking-[.13em] text-slate-400 font-bold mb-1">
            Network coverage
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-extrabold tracking-tight">
              {String(boxes.length).padStart(2, "0")}
            </span>
            <span className="text-xs text-slate-500 pb-1">
              active postboxes
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
