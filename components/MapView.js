/**
 * Интерактивная карта Риги на базе Leaflet: запрашивает GPS-позицию пользователя,
 * отрисовывает маркеры ящиков с защитой от сброса и прокладывает маршрут с учетом текущей геолокации.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { getBoxStatus, getBoxPercent } from "@/data/initialBoxes";

export default function MapView({
  boxes,
  selectedId,
  onSelectBox,
  routePoints,
  routeActive,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef(new Map());
  const userMarkerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const [userPos, setUserPos] = useState({ lat: 56.9515, lng: 24.112 }); // Центр Риги по умолчанию

  // Инициализация карты и запрос GPS пользователя
  useEffect(() => {
    if (mapInstanceRef.current || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([56.9515, 24.112], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    mapInstanceRef.current = map;

    // Запрос геолокации браузера
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserPos(pos);
          map.setView([pos.lat, pos.lng], 14);

          // Добавляем маркер пользователя
          const userIcon = L.divIcon({
            className: "",
            html: `<div style="background:#2563eb; width:16px; height:16px; border:3px solid white; border-radius:50%; box-shadow:0 0 10px rgba(37,99,235,0.5);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          userMarkerRef.current = L.marker([pos.lat, pos.lng], {
            icon: userIcon,
          }).addTo(map);
          userMarkerRef.current.bindTooltip("Your location", {
            direction: "top",
          });
        },
        () => {
          // Если пользователь запретил геолокацию — остаемся в центре Риги
          console.log("Geolocation permission denied or unavailable");
        },
      );
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Гарантированная отрисовка и обновление маркеров ящиков (исправляет проблему исчезновения)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Очищаем старые маркеры, чтобы избежать дублирования
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

  // Плавный перелет к выбранному ящику
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedId) return;
    const box = boxes.find((b) => b.id === selectedId);
    if (box) {
      map.flyTo([box.lat, box.lng], Math.max(map.getZoom(), 15), {
        duration: 0.55,
      });
    }
  }, [selectedId, boxes]);

  // Построение маршрута от позиции пользователя через OSRM
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (routeActive && routePoints.length > 0) {
      // Строим путь: [Позиция пользователя] -> [Точки ящиков]
      const pointsCoords = [
        [userPos.lng, userPos.lat],
        ...routePoints.map((b) => [b.lng, b.lat]),
      ];
      const coordsString = pointsCoords.map((c) => c.join(",")).join(";");
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;

      fetch(osrmUrl)
        .then((res) => res.json())
        .then((data) => {
          if (data.routes && data.routes.length > 0) {
            const routeCoords = data.routes[0].geometry.coordinates.map((c) => [
              c[1],
              c[0],
            ]);

            routeLayerRef.current = L.polyline(routeCoords, {
              color: "#0b9b70",
              weight: 5,
              opacity: 0.9,
              lineCap: "round",
              lineJoin: "round",
            }).addTo(map);

            map.fitBounds(routeLayerRef.current.getBounds().pad(0.25));
          }
        })
        .catch(() => {
          const fallbackCoords = [
            [userPos.lat, userPos.lng],
            ...routePoints.map((b) => [b.lat, b.lng]),
          ];
          routeLayerRef.current = L.polyline(fallbackCoords, {
            color: "#0b9b70",
            weight: 5,
            opacity: 0.9,
          }).addTo(map);
          map.fitBounds(routeLayerRef.current.getBounds().pad(0.25));
        });
    }
  }, [routePoints, routeActive, userPos]);

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
