/**
 * Экран курьера у точки: один главный ответ («собрать / не нужно»)
 * и одна главная кнопка «Mark as collected».
 */
"use client";

import { getBoxStatus, getBoxPercent } from "@/data/initialBoxes";

const STYLE = {
  full: { bar: "bg-rose-500", text: "text-rose-600", label: "Full — collect now" },
  warning: { bar: "bg-amber-400", text: "text-amber-600", label: "Almost full" },
  normal: { bar: "bg-emerald-500", text: "text-emerald-700", label: "All good" },
};

export default function CourierPickupSheet({ box, onClose, onCollect }) {
  if (!box) return null;

  const status = getBoxStatus(box);
  const pct = getBoxPercent(box);
  const isFull = status === "full";
  const st = STYLE[status];

  const navUrl = `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${box.lat},${box.lng}`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-700 md:inset-x-auto md:left-5 md:bottom-5 md:w-96 bg-white rounded-t-3xl md:rounded-2xl border border-slate-200 shadow-2xl shadow-slate-900/20 overflow-hidden">
      <div className={`h-1.5 ${st.bar}`} />
      <div className="p-5 pb-6">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <h3 className="font-black text-xl truncate">{box.name}</h3>
            <p className="text-sm text-slate-500 mt-0.5 truncate">
              {box.address}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 rounded-md p-1 cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex items-end justify-between">
          <span className={`text-5xl font-black leading-none ${st.text}`}>
            {pct}%
          </span>
          <span className={`text-base font-bold ${st.text}`}>{st.label}</span>
        </div>
        <div className="h-3 rounded-full bg-slate-100 overflow-hidden mt-3">
          <div
            className={`h-full rounded-full transition-all ${st.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {isFull ? (
          <button
            onClick={() => onCollect(box.id)}
            className="mt-5 w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-[0.98] text-white text-lg font-extrabold shadow-lg shadow-emerald-600/25 transition cursor-pointer"
          >
            ✓ Mark as collected
          </button>
        ) : (
          <div className="mt-5 rounded-2xl bg-emerald-50 text-emerald-800 text-base font-bold text-center py-4">
            No pickup needed yet
          </div>
        )}

        <a
          href={navUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block w-full text-center py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-bold text-slate-700 transition"
        >
          Open in Google Maps
        </a>
      </div>
    </div>
  );
}
