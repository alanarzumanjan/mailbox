"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { getBoxStatus, getBoxPercent } from "@/data/initialBoxes";

const RIGA_CENTER = { lat: 56.9515, lng: 24.112 };

const ROUTING_SERVERS = [
  "https://routing.openstreetmap.de/routed-car/route/v1/driving",
  "https://router.project-osrm.org/route/v1/driving",
];

const MAILBOX_SVG = `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" fill-rule="evenodd" aria-hidden="true" style="display:block;color:#fff"><path d="M4 9a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v7H4zM8 8h8a1 1 0 0 1 0 2H8a1 1 0 0 1 0-2zM10.5 16h3v5h-3zM8 21h8v1.5H8z"/></svg>`;

async function fetchRoadRoute(coordsString, signal) {
  for (const server of ROUTING_SERVERS) {
    try {
      const res = await fetch(
        `${server}/${coordsString}?overview=full&geometries=geojson`,
        { signal },
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data.code === "Ok" && data.routes?.length > 0) return data.routes[0];
    } catch (err) {
      if (err.name === "AbortError") throw err;
    }
  }
  throw new Error("Routing unavailable");
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

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: false,
    }).setView([RIGA_CENTER.lat, RIGA_CENTER.lng], 13);

    // Используем стандартный OpenStreetMap без требования API-ключей
    const tileLayer = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
      },
    ).addTo(map);

    if (tileLayer.getContainer()) {
      tileLayer.getContainer().style.filter =
        "grayscale(80%) contrast(110%) brightness(98%) opacity(95%)";
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    boxes.forEach((box) => {
      const status = getBoxStatus(box);
      const pct = getBoxPercent(box);

      const icon = L.divIcon({
        className: "",
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
      markersRef.current.push(marker);
    });
  }, [boxes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    routeLayersRef.current.forEach((l) => map.removeLayer(l));
    routeLayersRef.current = [];

    if (!routeActive || routePoints.length === 0) {
      map.setView([RIGA_CENTER.lat, RIGA_CENTER.lng], 13);
      onDistancesCalculated?.(0, 0);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const baseCoords = [
      [RIGA_CENTER.lng, RIGA_CENTER.lat],
      ...boxes.map((b) => [b.lng, b.lat]),
    ]
      .map((c) => c.join(","))
      .join(";");

    const smartCoords = [
      [RIGA_CENTER.lng, RIGA_CENTER.lat],
      ...routePoints.map((b) => [b.lng, b.lat]),
    ]
      .map((c) => c.join(","))
      .join(";");

    Promise.all([
      fetchRoadRoute(baseCoords, controller.signal).catch(() => null),
      fetchRoadRoute(smartCoords, controller.signal).catch(() => null),
    ]).then(([baseRoute, smartRoute]) => {
      if (cancelled || !mapRef.current) return;

      let baseKm = 38.7;
      let smartKm = 13.1;

      if (baseRoute) {
        baseKm = Number((baseRoute.distance / 1000).toFixed(1));
        const baseLatlngs = baseRoute.geometry.coordinates.map(([lng, lat]) => [
          lat,
          lng,
        ]);
        const baseLayer = L.polyline(baseLatlngs, {
          color: "#172033",
          weight: 4,
          dashArray: "6 6",
          opacity: 0.7,
        }).addTo(map);
        routeLayersRef.current.push(baseLayer);
      }

      if (smartRoute) {
        smartKm = Number((smartRoute.distance / 1000).toFixed(1));
        const smartLatlngs = smartRoute.geometry.coordinates.map(
          ([lng, lat]) => [lat, lng],
        );
        const smartLayer = L.polyline(smartLatlngs, {
          color: "#059669",
          weight: 5.5,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);
        routeLayersRef.current.push(smartLayer);

        map.fitBounds(smartLayer.getBounds().pad(0.15));
      }

      onDistancesCalculated?.(baseKm, smartKm);
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [routeActive, routePoints, boxes, onDistancesCalculated]);

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50 z-0">
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
