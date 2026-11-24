/**
 * Карточка выбранного ящика: один главный факт — процент заполнения,
 * дальше вес, батарея и время обновления.
 */
"use client";

import { getBoxStatus, getBoxPercent } from "@/data/initialBoxes";
import { LOW_BATTERY_THRESHOLD } from "@/data/dispatchData";

const STYLE = {
  full: {
    bar: "bg-rose-500",
    text: "text-rose-600",
    label: "Full — collect now",
  },
  warning: {
    bar: "bg-amber-400",
    text: "text-amber-600",
    label: "Almost full",
  },
  normal: {
    bar: "bg-emerald-500",
    text: "text-emerald-700",
    label: "All good",
  },
};

export default function DetailDrawer({ box, onClose }) {
  if (!box) return null;

  const status = getBoxStatus(box);
  const pct = getBoxPercent(box);
  const st = STYLE[status];
  const lowBattery = box.battery <= LOW_BATTERY_THRESHOLD;

  return (
    <div className="fixed bottom-5 left-5 z-700 w-[min(380px,calc(100vw-40px))] bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-900/15 overflow-hidden">
      <div className={`h-1.5 ${st.bar}`} />
      <div className="p-5">
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
            aria-label="Close details"
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
        <div className="text-sm text-slate-500 mt-2">
          {box.weight.toLocaleString("en-US")} g of{" "}
          {box.max.toLocaleString("en-US")} g
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="text-xs text-slate-500">Battery</div>
            <div
              className={`text-lg font-black mt-0.5 ${lowBattery ? "text-rose-600" : "text-slate-900"}`}
            >
              {box.battery}%
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="text-xs text-slate-500">Updated</div>
            <div className="text-lg font-black mt-0.5">{box.updated}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
