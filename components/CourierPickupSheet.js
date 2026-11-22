/**
 * Экран курьера у точки забора: кнопка «Mark as Collected»
 * для полного ящика и быстрая навигация в Google Maps.
 */
"use client";

import { getBoxStatus, getBoxPercent } from "@/data/initialBoxes";

export default function CourierPickupSheet({ box, onClose, onCollect }) {
  if (!box) return null;

  const status = getBoxStatus(box);
  const pct = getBoxPercent(box);
  const isFull = status === "full";

  const barColor =
    status === "full"
      ? "bg-rose-500"
      : status === "warning"
        ? "bg-amber-400"
        : "bg-emerald-500";
  const statusLabel =
    status === "full"
      ? "FULL · PICKUP REQUIRED"
      : status === "warning"
        ? "NEAR CAPACITY"
        : "NORMAL · NO PICKUP NEEDED";

  const navUrl = `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${box.lat},${box.lng}`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[700] md:inset-x-auto md:left-5 md:bottom-5 md:w-[380px] bg-white rounded-t-3xl md:rounded-2xl border border-slate-200 shadow-2xl shadow-slate-900/20 overflow-hidden">
      <div className={`h-1.5 ${barColor}`} />
      <div className="p-4 pb-5">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[.12em] font-bold text-slate-400">
              Pickup point · {box.id}
            </div>
            <h3 className="font-extrabold text-lg mt-1 truncate">{box.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{box.address}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 rounded-md p-1 cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="font-semibold text-slate-600">Mail weight</span>
            <strong className="text-slate-800">
              {box.weight.toLocaleString("en-US")}g /{" "}
              {box.max.toLocaleString("en-US")}g
            </strong>
          </div>
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] font-bold text-slate-500">
            {pct}% · {statusLabel}
          </div>
        </div>

        {isFull ? (
          <button
            onClick={() => onCollect(box.id)}
            className="mt-3 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-[0.98] text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
          >
            ✓ Mark as Collected
          </button>
        ) : (
          <div className="mt-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold text-center py-3">
            This postbox doesn’t need a pickup yet
          </div>
        )}

        <a
          href={navUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block w-full text-center py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
        >
          Navigate here in Google Maps
        </a>
      </div>
    </div>
  );
}
