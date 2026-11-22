/**
 * Боковая панель: сводка по ящикам, фильтр районов, навигация курьера
 * (маршрут, Google Maps, метрики), затем список точек выемки с симулятором писем.
 */
"use client";

import { useState } from "react";
import { getBoxStatus, getBoxPercent } from "@/data/initialBoxes";

export default function Sidebar({
  sidebarRef,
  boxes,
  selectedId,
  onSelectBox,
  onSimulateMail,
  onOptimizeRoute,
  routeActive,
  routePoints,
  routeDistance,
  role,
  districts,
  district,
  onDistrictChange,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const isCourier = role === "courier";

  const fullCount = boxes.filter((b) => getBoxStatus(b) === "full").length;
  const normalCount = boxes.filter((b) => getBoxStatus(b) === "normal").length;
  const nextStop = routePoints[0] || null;

  // Экономия топлива относительно фиксированного объезда всех ящиков (~3.2 км на точку)
  const baselineDistance = boxes.length * 3.2;
  const currentDistance = routeDistance || 0;
  const fuelSavedPercent =
    currentDistance > 0 && baselineDistance > currentDistance
      ? Math.min(
          85,
          Math.max(
            12,
            Math.round(
              ((baselineDistance - currentDistance) / baselineDistance) * 100,
            ),
          ),
        )
      : 0;

  const handleOpenGoogleMaps = () => {
    if (routePoints.length === 0) return;
    const destination = routePoints[routePoints.length - 1];
    const waypoints = routePoints
      .slice(0, -1)
      .map((b) => `${b.lat},${b.lng}`)
      .join("|");

    // Начальная точка не указана — Google Maps возьмёт текущее положение пользователя
    let url =
      `https://www.google.com/maps/dir/?api=1&travelmode=driving` +
      `&destination=${destination.lat},${destination.lng}`;
    if (waypoints) {
      url += `&waypoints=${encodeURIComponent(waypoints)}`;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <aside
      ref={sidebarRef}
      className={`${
        collapsed ? "md:w-19" : "md:w-97.5 xl:w-105"
      } w-full shrink-0 bg-white border-l border-slate-200 flex flex-col min-h-0 md:overflow-y-auto scrollbar relative z-10 transition-all duration-200`}
    >
      {/* Заголовок */}
      <div
        className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-5 pt-5 pb-3`}
      >
        {!collapsed && (
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[17px] font-extrabold tracking-tight">
                {isCourier ? "My pickups" : "Postbox fleet"}
              </h1>
              {fullCount > 0 && (
                <span className="text-[10px] bg-rose-50 text-rose-600 border border-rose-100 rounded-full px-2 py-0.5 font-bold">
                  {fullCount} needs attention
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isCourier
                ? "Your assigned zone in Riga"
                : "Live status across the Riga network"}
            </p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 items-center justify-center cursor-pointer"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d={collapsed ? "m9 18 6-6-6-6" : "m15 18-6-6 6-6"} />
          </svg>
        </button>
      </div>

      {/* Фильтр районов — только в режиме курьера */}
      {isCourier && !collapsed && (
        <div className="px-5 pb-3">
          <div className="text-[10px] uppercase tracking-[.12em] font-bold text-slate-400 mb-2">
            Zone of responsibility
          </div>
          <div className="flex flex-wrap gap-1.5">
            {districts.map((d) => (
              <button
                key={d.id}
                onClick={() => onDistrictChange(d.id)}
                className={`text-xs font-semibold px-3 py-2 rounded-full border transition cursor-pointer ${
                  district === d.id
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Счётчики */}
      {!collapsed && (
        <div className="grid grid-cols-3 gap-2 px-5 pb-4">
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
            <div className="text-[10px] text-slate-400 font-semibold">
              TOTAL
            </div>
            <div className="text-xl font-extrabold mt-0.5">
              {String(boxes.length).padStart(2, "0")}
            </div>
          </div>
          <div className="rounded-xl bg-emerald-50/70 border border-emerald-100/70 px-3 py-2.5">
            <div className="text-[10px] text-emerald-700/70 font-semibold">
              NORMAL
            </div>
            <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
              {String(normalCount).padStart(2, "0")}
            </div>
          </div>
          <div className="rounded-xl bg-rose-50/70 border border-rose-100/70 px-3 py-2.5">
            <div className="text-[10px] text-rose-600/70 font-semibold">
              FULL
            </div>
            <div className="text-xl font-extrabold text-rose-600 mt-0.5">
              {String(fullCount).padStart(2, "0")}
            </div>
          </div>
        </div>
      )}

      {/* Навигация курьера: маршрут, Google Maps, метрики */}
      <div className="border-y border-slate-100 p-5 pt-4 space-y-2.5">
        {!collapsed && (
          <div className="flex items-center justify-between mb-1">
            <div>
              <div className="text-sm font-bold">
                {isCourier ? "Courier navigation" : "Courier dispatch"}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {isCourier
                  ? "Route to full boxes in your zone"
                  : "Collect full boxes in one run"}
              </div>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-bold">
              SMART ROUTING
            </span>
          </div>
        )}

        {/* Следующая остановка (режим курьера) */}
        {isCourier && routeActive && nextStop && !collapsed && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[.12em] font-bold text-emerald-700">
                Next stop
              </div>
              <div className="font-extrabold text-sm truncate">
                {nextStop.name}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {nextStop.address}
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-700/80 whitespace-nowrap">
              {routePoints.length} left
            </span>
          </div>
        )}

        <button
          onClick={onOptimizeRoute}
          className={`w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl ${
            collapsed ? "py-3 px-2" : "py-3.5"
          } shadow-lg shadow-emerald-600/15 transition cursor-pointer`}
        >
          <svg
            className="w-4.25 h-4.25 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 7h11l-3-3m3 3-3 3M20 17H9l3 3m-3-3 3-3" />
          </svg>
          {!collapsed && (
            <span>
              {isCourier ? "Build my route" : "Optimize courier route"}
            </span>
          )}
        </button>

        {routeActive && (
          <button
            onClick={handleOpenGoogleMaps}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl py-2.5 transition cursor-pointer"
          >
            <svg
              className="w-4 h-4 text-emerald-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            {!collapsed && <span>Open route in Google Maps</span>}
          </button>
        )}

        {routeActive && !collapsed && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-semibold">
                  EST. DISTANCE
                </span>
                <div className="relative group">
                  <span className="w-3.5 h-3.5 rounded-full bg-slate-200/80 text-slate-500 hover:bg-slate-300 hover:text-slate-700 text-[9px] font-bold flex items-center justify-center cursor-help transition">
                    ?
                  </span>
                  <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-150 absolute bottom-full left-0 mb-2 w-48 p-2.5 bg-slate-900 text-white text-[11px] leading-snug rounded-xl shadow-xl z-50 pointer-events-none">
                    Real driving distance calculated via OSRM road network from
                    your GPS location through full boxes only.
                    <div className="w-2 h-2 bg-slate-900 rotate-45 absolute -bottom-1 left-1.5" />
                  </div>
                </div>
              </div>
              <div className="font-extrabold text-lg mt-0.5">
                {currentDistance > 0 ? currentDistance : "..."}{" "}
                <span className="text-xs font-semibold text-slate-400">km</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-semibold">
                  FUEL SAVED
                </span>
                <div className="relative group">
                  <span className="w-3.5 h-3.5 rounded-full bg-slate-200/80 text-slate-500 hover:bg-slate-300 hover:text-slate-700 text-[9px] font-bold flex items-center justify-center cursor-help transition">
                    ?
                  </span>
                  <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-150 absolute bottom-full right-0 mb-2 w-52 p-2.5 bg-slate-900 text-white text-[11px] leading-snug rounded-xl shadow-xl z-50 pointer-events-none">
                    Estimated fuel & CO₂ reduction compared to a fixed daily
                    route visiting all {boxes.length} postboxes (~
                    {baselineDistance.toFixed(1)} km).
                    <div className="w-2 h-2 bg-slate-900 rotate-45 absolute -bottom-1 right-1.5" />
                  </div>
                </div>
              </div>
              <div className="font-extrabold text-lg text-emerald-600 mt-0.5">
                {fuelSavedPercent}
                <span className="text-xs">%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Заголовок списка + симулятор */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        {!collapsed && (
          <div className="text-[11px] uppercase tracking-[.12em] font-bold text-slate-400">
            Collection points
          </div>
        )}
        <button
          onClick={onSimulateMail}
          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-emerald-50 transition cursor-pointer mx-auto md:mx-0"
          title="Simulate incoming mail"
        >
          <span className="text-base leading-none">＋</span>
          {!collapsed && <span>Simulate incoming mail</span>}
        </button>
      </div>

      {/* Список ящиков */}
      <div className="px-3 pb-3 space-y-1">
        {boxes.length === 0 && !collapsed && (
          <div className="text-center text-sm text-slate-400 py-10 px-4">
            No postboxes in this zone yet
          </div>
        )}

        {boxes.map((box) => {
          const status = getBoxStatus(box);
          const pct = getBoxPercent(box);
          const dotColor =
            status === "full"
              ? "bg-rose-500"
              : status === "warning"
                ? "bg-amber-400"
                : "bg-emerald-500";
          const statusText =
            status === "full"
              ? "Pickup required"
              : status === "warning"
                ? "Near capacity"
                : "Operating normally";
          const statusColor =
            status === "full"
              ? "text-rose-600"
              : status === "warning"
                ? "text-amber-600"
                : "text-emerald-700";

          return (
            <button
              key={box.id}
              onClick={() => onSelectBox(box.id)}
              className={`w-full text-left flex items-center ${
                collapsed ? "justify-center px-0" : "gap-3 px-3"
              } py-3 rounded-xl border ${
                selectedId === box.id
                  ? "border-emerald-200 bg-emerald-50/50"
                  : "border-transparent hover:bg-slate-50"
              } transition cursor-pointer`}
            >
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-25 ${
                    status === "full" ? "animate-ping" : ""
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dotColor}`}
                />
              </span>

              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-bold text-slate-800 truncate">
                        {box.name}
                      </span>
                      <span className={`text-[10px] font-bold ${statusColor}`}>
                        {pct}%
                      </span>
                    </span>
                    <span className="block text-[11px] text-slate-400 truncate mt-0.5">
                      {box.id} · {box.updated}
                    </span>
                    <span className="flex items-center gap-2 mt-2">
                      <span className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                        <span
                          className={`block h-full rounded-full ${dotColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span
                        className={`text-[10px] ${statusColor} font-semibold whitespace-nowrap`}
                      >
                        {statusText}
                      </span>
                    </span>
                  </span>
                  <span className="text-slate-300 text-lg">›</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
