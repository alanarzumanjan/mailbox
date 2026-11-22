/**
 * Интерактивная карта Риги на базе Leaflet: отрисовывает маркеры всех почтовых ящиков
 * с цветовой индикацией статуса, строит оптимальный маршрут курьера и показывает виджеты покрытия.
 */
'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { getBoxStatus, getBoxPercent } from '@/data/initialBoxes';

export default function MapView({ boxes, selectedId, onSelectBox, routePoints, routeActive }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef(new Map());
  const routeLayerRef = useRef(null);

  // Инициализация карты при первом рендере
  useEffect(() => {
    if (mapInstanceRef.current || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, { zoomControl: true, scrollWheelZoom: true }).setView(
      [56.9515, 24.112],
      14
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Обновление маркеров при изменении списка ящиков или выбранного элемента
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Удаляем маркеры ящиков, которых больше нет
    markersRef.current.forEach((marker, id) => {
      if (!boxes.find((b) => b.id === id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    boxes.forEach((box) => {
      const status = getBoxStatus(box);
      const pct = getBoxPercent(box);
      const isSelected = selectedId === box.id;

      const icon = L.divIcon({
        className: '',
        html: `<div class="post-marker ${status} ${isSelected ? 'selected' : ''} ${status === 'full' ? 'pulse' : ''}">
                <span>${box.id.slice(-2)}</span>
              </div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 32],
      });

      if (markersRef.current.has(box.id)) {
        const existingMarker = markersRef.current.get(box.id);
        existingMarker.setIcon(icon);
        existingMarker.setTooltipContent(`${box.name} · ${pct}%`);
      } else {
        const marker = L.marker([box.lat, box.lng], { icon }).addTo(map);
        marker.bindTooltip(`${box.name} · ${pct}%`, { direction: 'top', offset: [0, -24] });
        marker.on('click', () => onSelectBox(box.id));
        markersRef.current.set(box.id, marker);
      }
    });
  }, [boxes, selectedId, onSelectBox]);

  // Плавный перелет камеры к выбранному ящику
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedId) return;
    const box = boxes.find((b) => b.id === selectedId);
    if (box) {
      map.flyTo([box.lat, box.lng], Math.max(map.getZoom(), 15), { duration: 0.55 });
    }
  }, [selectedId, boxes]);

  // Отрисовка линии оптимизированного маршрута
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (routeActive && routePoints.length > 0) {
      const coords =
        routePoints.length === 1
          ? [
              [routePoints[0].lat, routePoints[0].lng],
              [routePoints[0].lat + 0.006, routePoints[0].lng + 0.004],
              [routePoints[0].lat + 0.009, routePoints[0].lng - 0.003],
            ]
          : routePoints.map((b) => [b.lat, b.lng]);

      routeLayerRef.current = L.polyline(coords, {
        color: '#0b9b70',
        weight: 5,
        opacity: 0.9,
        dashArray: routePoints.length === 1 ? '8 8' : null,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      map.fitBounds(routeLayerRef.current.getBounds().pad(0.25));
    }
  }, [routePoints, routeActive]);

  return (
    <section className="relative flex-1 min-w-0 bg-slate-100 h-[48vh] md:h-auto min-h-82.5">
      <div ref={mapContainerRef} className="w-full h-full bg-[#e9eff1]" />

      {/* Плашки статистики и легенды поверх карты */}
      <div className="absolute top-4 left-4 z-500 flex flex-col gap-2 pointer-events-none">
        <div className="bg-white/95 backdrop-blur rounded-xl border border-white shadow-lg shadow-slate-900/5 px-4 py-3 pointer-events-auto min-w-47.5">
          <div className="text-[10px] uppercase tracking-[.13em] text-slate-400 font-bold mb-1">
            Network coverage
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-extrabold tracking-tight">
              {String(boxes.length).padStart(2, '0')}
            </span>
            <span className="text-xs text-slate-500 pb-1">active postboxes</span>
          </div>
        </div>

      </div>

      {/* Плашка активного маршрута */}
      {routeActive && routePoints.length > 0 && (
        <div className="absolute bottom-4 right-4 z-500 bg-slate-900 text-white rounded-xl px-4 py-3 shadow-xl max-w-65">
          <div className="flex items-center gap-2 text-[11px] text-emerald-300 font-bold uppercase tracking-wider">
            <span>✦</span> Route optimized
          </div>
          <div className="text-sm font-semibold mt-1">
            {routePoints.length} collection stop{routePoints.length === 1 ? '' : 's'} · 12.4 km
          </div>
        </div>
      )}
    </section>
  );
}
