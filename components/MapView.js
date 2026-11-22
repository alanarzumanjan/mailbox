/**
- Интерактивная карта Риги на базе Leaflet: GPS-позиция курьера, маркеры ящиков,
- реальный маршрут по дорогам (OSRM), зум на район и автоопределение прибытия к точке.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { getBoxStatus, getBoxPercent } from "@/data/initialBoxes";

const DEFAULT_POS = { lat: 56.9515, lng: 24.112 };
const ARRIVAL_RADIUS_KM = 0.04; // 40 м
const REROUTE_DISTANCE_KM = 0.15; // пересчёт маршрута, если курьер сместился на 150 м

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
  viewTarget,
  courierMode,
  onArrive,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef(new Map());
  const userMarkerRef = useRef(null);
  const routeLayerRef = useRef(null);

  const livePosRef = useRef(null);
  const hasRealPosRef = useRef(false);
  const centeredRef = useRef(false);
  const lastFitRef = useRef(null);
  const lastArrivedRef = useRef(null);

  // Свежие значения пропсов для колбэков и эффектов без лишних перезапусков
  const routePointsRef = useRef(routePoints);
  const routeActiveRef = useRef(routeActive);
  const courierRef = useRef(courierMode);
  const viewTargetRef = useRef(viewTarget);
  const onDistanceRef = useRef(onDistanceCalculated);
  const onArriveRef = useRef(onArrive);
  const boxesRef = useRef(boxes);

  // Синхронизируем значения рефов через useEffect (без ошибок рендеринга)
  useEffect(() => {
    routePointsRef.current = routePoints;
    routeActiveRef.current = routeActive;
    courierRef.current = courierMode;
    viewTargetRef.current = viewTarget;
    onDistanceRef.current = onDistanceCalculated;
    onArriveRef.current = onArrive;
    boxesRef.current = boxes;
  }, [
    routePoints,
    routeActive,
    courierMode,
    viewTarget,
    onDistanceCalculated,
    onArrive,
    boxes,
  ]);

  const [userPos, setUserPos] = useState(DEFAULT_POS);
  const [hasRealPos, setHasRealPos] = useState(false);

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

  // 2. Слежение за GPS (позиция, маркер, определение прибытия)
  useEffect(() => {
    if (!navigator.geolocation) return;
    let cancelled = false;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (cancelled || !mapInstanceRef.current) return;
        const p = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        livePosRef.current = p;
        userMarkerRef.current?.setLatLng([p.lat, p.lng]);

        if (!hasRealPosRef.current) {
          hasRealPosRef.current = true;
          setUserPos(p);
          setHasRealPos(true);
        } else {
          // Маршрут пересчитываем только при заметном перемещении
          setUserPos((prev) =>
            haversineKm(prev, p) > REROUTE_DISTANCE_KM ? p : prev,
          );
        }

        // Прибытие к следующей точке маршрута
        const next = routePointsRef.current[0];
        if (courierRef.current && routeActiveRef.current && next) {
          const dist = haversineKm(p, next);
          if (dist < ARRIVAL_RADIUS_KM && lastArrivedRef.current !== next.id) {
            lastArrivedRef.current = next.id;
            onArriveRef.current?.(next.id);
          } else if (dist > 0.1 && lastArrivedRef.current === next.id) {
            lastArrivedRef.current = null;
          }
        }
      },
      () => console.log("Geolocation permission denied or unavailable"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // 3. Маркер пользователя + однократное центрирование на нём
  useEffect(() => {
    const map = mapInstanceRef.current;
    const pos = livePosRef.current;
    if (!map || !hasRealPos || !pos) return;

    if (!centeredRef.current) {
      centeredRef.current = true;
      // Если курьер уже выбрал район — не уводим карту от него
      if (!viewTargetRef.current) map.setView([pos.lat, pos.lng], 14);
    }

    if (userMarkerRef.current) return;

    const userIcon = L.divIcon({
      className: "",
      html: `<div style="background:#2563eb; width:16px; height:16px; border:3px solid white; border-radius:50%; box-shadow:0 0 10px rgba(37,99,235,0.5);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    userMarkerRef.current = L.marker([pos.lat, pos.lng], {
      icon: userIcon,
    }).addTo(map);
    userMarkerRef.current.bindTooltip("Your location", { direction: "top" });
  }, [hasRealPos]);

  // 4. Подгон карты под видимые ящики района (или всей Риги)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !viewTarget) return;

    const pts = boxesRef.current;
    if (pts.length > 0) {
      map.flyToBounds(L.latLngBounds(pts.map((b) => [b.lat, b.lng])), {
        padding: [60, 60],
        maxZoom: 15,
        duration: 0.7,
      });
    } else {
      map.flyTo(viewTarget.center, viewTarget.zoom, { duration: 0.7 });
    }
  }, [viewTarget]);

  // 5. Маркеры ящиков
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

  // 6. Перелёт к выбранному ящику
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

  // 7. Реальный маршрут по дорогам (перестраивается при смене точек или позиции)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    const points = routePointsRef.current;
    if (!routeActive || points.length === 0) {
      lastFitRef.current = null;
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

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
      // Подгоняем карту только при новом наборе точек, не при каждом сдвиге GPS
      if (lastFitRef.current !== routeKey) {
        lastFitRef.current = routeKey;
        map.fitBounds(layer.getBounds().pad(0.25));
      }
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
    <section className="relative flex-1 min-w-0 bg-slate-100 h-[48vh] md:h-auto min-h-82.5">
      <div ref={mapContainerRef} className="w-full h-full bg-[#e9eff1]" />

      <div className="absolute top-4 left-4 z-500 flex flex-col gap-2 pointer-events-none">
        <div className="bg-white/95 backdrop-blur rounded-xl border border-white shadow-lg shadow-slate-900/5 px-4 py-3 pointer-events-auto min-w-47.5">
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
