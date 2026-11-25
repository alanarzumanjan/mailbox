/**
 * Боковая панель курьера. Порядок чтения сверху вниз (Z-паттерн):
 *  вердикт «сколько собрать» → зона → ГЛАВНАЯ кнопка → следующая остановка → список (≤ 7).
 * После нажатия «Build my route» панель сама прокручивается так, чтобы
 * кнопка «Open in Google Maps» оказалась в самом низу экрана.
 */
"use client";

import { useState, useRef, useEffect } from "react";
import { getBoxStatus, getBoxPercent } from "@/data/initialBoxes";
import { ChevronDown, MapPin, Navigation, Play, Route } from "lucide-react";

const VISIBLE_ROWS = 7; // Миллер: 7 ± 2
const STATUS_RANK = { full: 0, warning: 1, normal: 2 };

const LIST_STYLE = {
  full: {
    dot: "bg-rose-500",
    icon: "text-rose-500",
    text: "text-rose-600",
    label: "Full",
  },
  warning: {
    dot: "bg-amber-400",
    icon: "text-amber-500",
    text: "text-amber-600",
    label: "Almost full",
  },
  normal: {
    dot: "bg-emerald-500",
    icon: "text-emerald-500",
    text: "text-emerald-700",
    label: "OK",
  },
};

// Залитая иконка почтового ящика (без обводки), цвет берётся из currentColor
function MailboxIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      fillRule="evenodd"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 9a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v7H4zM8 8h8a1 1 0 0 1 0 2H8a1 1 0 0 1 0-2zM10.5 16h3v5h-3zM8 21h8v1.5H8z" />
    </svg>
  );
}

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
  const [showAll, setShowAll] = useState(false);
  const routeCardRef = useRef(null);
  const pendingScrollRef = useRef(false);
  const isCourier = role === "courier";

  const fullCount = boxes.filter((b) => getBoxStatus(b) === "full").length;
  const nextStop = routePoints[0] || null;

  // Самые срочные — наверху
  const sorted = [...boxes].sort(
    (a, b) =>
      STATUS_RANK[getBoxStatus(a)] - STATUS_RANK[getBoxStatus(b)] ||
      b.weight / b.max - a.weight / a.max,
  );
  const visible = showAll ? sorted : sorted.slice(0, VISIBLE_ROWS);

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

  const scrollToRouteCard = () => {
    routeCardRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  // Карточка маршрута появляется после нажатия — тогда и прокручиваем
  useEffect(() => {
    if (pendingScrollRef.current && routeActive && routeCardRef.current) {
      pendingScrollRef.current = false;
      scrollToRouteCard();
    }
  }, [routeActive, nextStop?.id]);

  const handleBuildRoute = () => {
    onOptimizeRoute();

    if (routeActive) {
      // Маршрут уже был: карточка на месте, прокручиваем сразу
      requestAnimationFrame(scrollToRouteCard);
    } else {
      // Ждём, пока карточка отрисуется (эффект выше)
      pendingScrollRef.current = true;
      setTimeout(() => (pendingScrollRef.current = false), 1500);
    }
  };

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
      className="w-full md:w-97.5 xl:w-105 shrink-0 bg-white border-l border-slate-200 flex flex-col min-h-0 md:overflow-y-auto scrollbar relative z-10"
    >
      {/* ① Вердикт: сколько ящиков нужно забрать */}
      <div
        data-tour="courier-verdict"
        className="px-5 pt-6 pb-4 flex items-center gap-4"
      >
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl font-black text-white shrink-0 ${
            fullCount > 0 ? "bg-rose-500" : "bg-emerald-500"
          }`}
          aria-hidden="true"
        >
          {fullCount > 0 ? fullCount : "✓"}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight leading-tight">
            {fullCount > 0
              ? fullCount === 1
                ? "1 pickup to do"
                : `${fullCount} pickups to do`
              : "Nothing to collect"}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isCourier ? "In your zone" : "Across the Riga network"}
          </p>
        </div>
      </div>

      {/* ② Зона курьера: 4 кнопки */}
      {isCourier && (
        <div className="px-5 pb-4 flex flex-wrap gap-2">
          {districts.map((d) => (
            <button
              key={d.id}
              onClick={() => onDistrictChange(d.id)}
              aria-pressed={district === d.id}
              className={`text-sm font-semibold px-4 py-2 rounded-full border transition cursor-pointer ${
                district === d.id
                  ? "bg-slate-900 border-slate-900 text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      {/* ③ Главное действие — одна заметная кнопка */}
      <div className="px-5 pb-5 space-y-3">
        <button
          data-tour="route"
          onClick={handleBuildRoute}
          className="w-full flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-[0.99] text-white font-extrabold text-lg rounded-2xl py-4 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
        >
          <Route className="w-5 h-5" />
          {routeActive
            ? "Update route"
            : isCourier
              ? "Build my route"
              : "Plan courier route"}
        </button>

        {/* Следующая остановка и итоги — только когда маршрут уже есть */}
        {routeActive && nextStop && (
          <div
            ref={routeCardRef}
            className="scroll-mb-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4"
          >
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-emerald-800">
                  Go next to
                </div>
                <div className="text-lg font-black leading-tight truncate">
                  {nextStop.name}
                </div>
                <div className="text-sm text-slate-600 truncate">
                  {nextStop.address}
                </div>
              </div>
              <span className="text-sm font-bold text-emerald-800 whitespace-nowrap">
                {routePoints.length} left
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-white rounded-xl px-3 py-2.5">
                <div className="text-xl font-black">
                  {currentDistance > 0 ? currentDistance : "…"}
                  <span className="text-sm font-semibold text-slate-400">
                    {" "}
                    km
                  </span>
                </div>
                <div className="text-xs text-slate-500">Total drive</div>
              </div>
              <div className="bg-white rounded-xl px-3 py-2.5">
                <div className="text-xl font-black text-emerald-600">
                  {fuelSavedPercent}
                  <span className="text-sm">%</span>
                </div>
                <div className="text-xs text-slate-500">Fuel saved (est.)</div>
              </div>
            </div>

            <button
              onClick={handleOpenGoogleMaps}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl py-3 transition cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              Open in Google Maps
            </button>
          </div>
        )}
      </div>

      {/* ④ Список точек: срочные сверху, максимум 7 */}
      <div className="border-t border-slate-100 px-5 pt-4 pb-2 flex items-center justify-between">
        <h2 className="text-lg font-extrabold tracking-tight">
          Postboxes
          <span className="ml-2 text-sm font-semibold text-slate-400">
            {boxes.length}
          </span>
        </h2>
        <button
          data-tour="demo"
          onClick={onSimulateMail}
          className="inline-flex items-center gap-1.5 text-sm font-extrabold text-amber-900 bg-amber-100 hover:bg-amber-200 border-2 border-dashed border-amber-400 px-3 py-1.5 rounded-lg transition cursor-pointer"
          title="Demo: a postbox fills up right now"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Demo: fill a postbox
        </button>
      </div>

      <div className="px-3 pb-4 space-y-1">
        {boxes.length === 0 && (
          <div className="text-center text-sm text-slate-500 py-10 px-4">
            No postboxes in this zone yet
          </div>
        )}

        {visible.map((box) => {
          const status = getBoxStatus(box);
          const pct = getBoxPercent(box);
          const st = LIST_STYLE[status];
          return (
            <button
              key={box.id}
              onClick={() => onSelectBox(box.id)}
              className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl border-2 transition cursor-pointer ${
                selectedId === box.id
                  ? "border-emerald-300 bg-emerald-50/60"
                  : "border-transparent hover:bg-slate-50"
              }`}
            >
              <MailboxIcon
                className={`w-6 h-6 shrink-0 ${st.icon} ${status === "full" ? "animate-pulse" : ""}`}
              />

              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[15px] font-bold text-slate-900 truncate">
                    {box.name}
                  </span>
                  <span className={`text-base font-black ${st.text}`}>
                    {pct}%
                  </span>
                </span>
                <span className="flex items-center gap-2 mt-1.5">
                  <span className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                    <span
                      className={`block h-full rounded-full ${st.dot}`}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className={`text-xs font-semibold ${st.text}`}>
                    {st.label}
                  </span>
                </span>
              </span>
            </button>
          );
        })}

        {boxes.length > VISIBLE_ROWS && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition cursor-pointer"
          >
            {showAll ? "Show fewer" : `Show all ${boxes.length}`}
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showAll ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>
    </aside>
  );
}
