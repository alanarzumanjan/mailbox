"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { getBoxStatus, getBoxPercent } from "@/data/initialBoxes";

const RIGA_CENTER = { lat: 56.9515, lng: 24.112 };
const REQUEST_TIMEOUT_MS = 4000; // если сервер маршрутов молчит — идём дальше, а не ждём вечно

const ROUTING_SERVERS = [
  "https://routing.openstreetmap.de/routed-car/route/v1/driving",
  "https://router.project-osrm.org/route/v1/driving",
];

const MAILBOX_SVG = `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" fill-rule="evenodd" aria-hidden="true" style="display:block;color:#fff"><path d="M4 9a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v7H4zM8 8h8a1 1 0 0 1 0 2H8a1 1 0 0 1 0-2zM10.5 16h3v5h-3zM8 21h8v1.5H8z"/></svg>`;

// Плавное появление маркеров и линий (только opacity — не ломает позиционирование Leaflet)
const MAP_CSS = `
@keyframes mgFade { from { opacity: 0; } to { opacity: 1; } }
.mg-marker-fade { animation: mgFade .45s ease-out both; }
.mg-route-fade { animation: mgFade .6s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .mg-marker-fade, .mg-route-fade { animation: none; }
}
`;

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

// Мгновенная оценка по прямым линиям × 1.3 — интерфейс никогда не ждёт сеть
function straightRoute(chain) {
  if (chain.length < 2) return { km: 0, latlngs: [], approx: true };
  let km = 0;
  for (let i = 1; i < chain.length; i++)
    km += haversineKm(chain[i - 1], chain[i]);
  return {
    km: Number((km * 1.3).toFixed(1)),
    latlngs: chain.map((p) => [p.lat, p.lng]),
    approx: true,
  };
}

// Запрос маршрута с таймаутом на каждый сервер
async function fetchRoadRoute(coordsString, signal) {
  for (const server of ROUTING_SERVERS) {
    const attempt = new AbortController();
    const timer = setTimeout(() => attempt.abort(), REQUEST_TIMEOUT_MS);
    const onOuterAbort = () => attempt.abort();
    signal.addEventListener("abort", onOuterAbort);
    try {
      const res = await fetch(
        `${server}/${coordsString}?overview=full&geometries=geojson`,
        { signal: attempt.signal },
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data.code === "Ok" && data.routes?.length > 0) return data.routes[0];
    } catch (err) {
      if (signal.aborted) throw err; // внешняя отмена (смена данных / размонтирование)
      // таймаут или сеть — пробуем следующий сервер
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", onOuterAbort);
    }
  }
  throw new Error("Routing unavailable");
}

async function loadRoute(chain, signal) {
  if (chain.length < 2) return { km: 0, latlngs: [], approx: false };
  try {
    const coords = chain.map((p) => `${p.lng},${p.lat}`).join(";");
    const route = await fetchRoadRoute(coords, signal);
    return {
      km: Number((route.distance / 1000).toFixed(1)),
      latlngs: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      approx: false,
    };
  } catch (err) {
    if (signal.aborted) throw err;
    return straightRoute(chain);
  }
}

export default function HeroLeafletMap({
  boxes,
  routePoints,
  routeActive,
  onDistancesCalculated,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const routeLayersRef = useRef([]);
  const wasActiveRef = useRef(false);
  const lastFitSigRef = useRef(null);

  const [exact, setExact] = useState(null); // { sig, base, smart } — маршруты по дорогам

  // Подпись набора данных: эффекты зависят от строки, а не от идентичности массивов,
  // поэтому новый массив с теми же ящиками никогда не запустит бесконечный перезапуск.
  const sig = useMemo(
    () =>
      `${boxes.map((b) => `${b.id}:${getBoxStatus(b)}`).join(",")}|${routePoints
        .map((b) => b.id)
        .join(",")}`,
    [boxes, routePoints],
  );

  // Мгновенная оценка (прямые линии) — доступна сразу, без сети
  const estimate = useMemo(
    () => ({
      base: straightRoute([RIGA_CENTER, ...boxes]),
      smart: straightRoute([RIGA_CENTER, ...routePoints]),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sig],
  );

  // Дорожный маршрут, если он уже посчитан для текущих данных; иначе оценка
  const routes = exact && exact.sig === sig ? exact : estimate;

  // Свежий колбэк без перезапуска эффектов
  const onDistancesRef = useRef(onDistancesCalculated);
  useEffect(() => {
    onDistancesRef.current = onDistancesCalculated;
  }, [onDistancesCalculated]);

  // 1. Создание карты
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: false,
    }).setView([RIGA_CENTER.lat, RIGA_CENTER.lng], 13);

    const tileLayer = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { maxZoom: 19 },
    ).addTo(map);

    if (tileLayer.getContainer()) {
      tileLayer.getContainer().style.filter =
        "grayscale(80%) contrast(110%) brightness(98%) opacity(95%)";
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
      routeLayersRef.current = [];
    };
  }, []);

  // 2. Маркеры ящиков (плавно появляются при каждой смене «дня»)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    boxes.forEach((box, i) => {
      const status = getBoxStatus(box);
      const pct = getBoxPercent(box);

      const icon = L.divIcon({
        className: "mg-marker-fade",
        html: `<div class="post-marker ${status} ${status === "full" ? "pulse" : ""}">
                 <span>${MAILBOX_SVG}</span>
               </div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 24],
      });

      const marker = L.marker([box.lat, box.lng], { icon }).addTo(map);
      marker.bindTooltip(`${box.name} · ${pct}%`, {
        direction: "top",
        offset: [0, -16],
      });
      const el = marker.getElement();
      if (el) el.style.animationDelay = `${Math.min(i * 15, 400)}ms`;
      markersRef.current.push(marker);
    });
  }, [boxes]);

  // 3. Фоновая загрузка реальных дорожных маршрутов (не блокирует интерфейс)
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    Promise.all([
      loadRoute([RIGA_CENTER, ...boxes], controller.signal),
      loadRoute([RIGA_CENTER, ...routePoints], controller.signal),
    ])
      .then(([base, smart]) => {
        if (!cancelled) setExact({ sig, base, smart });
      })
      .catch(() => {
        /* отмена — игнорируем */
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  // 4. Сообщаем километры наверх (срабатывает только при смене маршрутов)
  useEffect(() => {
    onDistancesRef.current?.(routes.base.km, routes.smart.km);
  }, [routes]);

  // 5. Рисуем маршруты
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    routeLayersRef.current.forEach((l) => map.removeLayer(l));
    routeLayersRef.current = [];

    if (!routeActive) {
      if (wasActiveRef.current) {
        map.flyTo([RIGA_CENTER.lat, RIGA_CENTER.lng], 13, { duration: 0.8 });
      }
      wasActiveRef.current = false;
      lastFitSigRef.current = null;
      return;
    }

    const justActivated = !wasActiveRef.current;
    wasActiveRef.current = true;

    if (routes.base.latlngs.length > 0) {
      routeLayersRef.current.push(
        L.polyline(routes.base.latlngs, {
          color: "#172033",
          weight: 4,
          dashArray: "6 6",
          opacity: 0.7,
          className: "mg-route-fade",
        }).addTo(map),
      );
    }

    let bounds = null;
    if (routes.smart.latlngs.length > 0) {
      const smartLayer = L.polyline(routes.smart.latlngs, {
        color: "#059669",
        weight: 5.5,
        // пока дорожный маршрут считается — линия пунктирная и бледнее
        opacity: routes.smart.approx ? 0.6 : 0.95,
        dashArray: routes.smart.approx ? "8 8" : undefined,
        lineCap: "round",
        lineJoin: "round",
        className: "mg-route-fade",
      }).addTo(map);
      routeLayersRef.current.push(smartLayer);
      bounds = smartLayer.getBounds();
    }

    // Подгоняем карту только при новом наборе ящиков, не при замене оценки на дорожный маршрут
    if (bounds && (justActivated || lastFitSigRef.current !== sig)) {
      lastFitSigRef.current = sig;
      const size = map.getSize();
      if (bounds.isValid() && size.x > 0 && size.y > 0) {
        map.flyToBounds(bounds.pad(0.15), { duration: 0.8 });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes, routeActive]);

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50 z-0">
      <style>{MAP_CSS}</style>
      <div ref={containerRef} className="w-full h-full" />

      {/* Glassmorphism Legend Pill (Pins) */}
      <div className="absolute top-3 left-3 z-[400] bg-white/85 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200/80 shadow-sm text-[11px] font-semibold text-slate-700 flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm" /> Full
          (&gt;80%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm" />{" "}
          Medium
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />{" "}
          Empty
        </span>
      </div>

      {/* Route Legend Pill (Bottom-Left) */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/85 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200/80 shadow-sm text-[10px] font-medium text-slate-600 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="w-5 h-0.5 border-t-3 border-dashed border-[#172033]" />{" "}
          Traditional blind route
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-1 bg-emerald-600 rounded-full" /> Emptyless
          smart route
        </div>
      </div>
    </div>
  );
}
