/**
 * Всплывающая карточка подробностей выбранного почтового ящика: показывает точный вес,
 * процент заполненности, статус необходимости выемки и уровень заряда батареи.
 */
"use client";

import { getBoxStatus, getBoxPercent } from "@/data/initialBoxes";

export default function DetailDrawer({ box, onClose }) {
  if (!box) return null;

  const status = getBoxStatus(box);
  const pct = getBoxPercent(box);

  const barColor =
    status === "full"
      ? "bg-rose-500"
      : status === "warning"
        ? "bg-amber-400"
        : "bg-emerald-500";
  const statusLabel =
    status === "full"
      ? "FULL · PICKUP"
      : status === "warning"
        ? "WARNING · MONITOR"
        : "NORMAL · ACTIVE";
  const textColor =
    status === "full"
      ? "text-rose-600"
      : status === "warning"
        ? "text-amber-600"
        : "text-emerald-600";

  return (
    <div className="fixed bottom-5 left-5 z-700 w-[min(360px,calc(100vw-40px))] bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-900/15 overflow-hidden">
      <div className={`h-1 ${barColor}`} />
      <div className="p-4">
        <div className="flex justify-between items-start gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[.12em] font-bold text-slate-400">
              POSTBOX · {box.id}
            </div>
            <h3 className="font-extrabold text-[16px] mt-1">{box.name}</h3>
            <p className="text-xs text-slate-500 mt-1">{box.address}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 rounded-md p-1 cursor-pointer"
            aria-label="Close details"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-3.5">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="font-semibold text-slate-600">
              Current capacity
            </span>
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
          <div className="flex justify-between mt-2 text-[10px] text-slate-400">
            <span>{pct}% full</span>
            <span className={`font-bold ${textColor}`}>{statusLabel}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="border border-slate-100 rounded-xl p-3">
            <div className="text-[10px] text-slate-400 font-semibold">
              BATTERY
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <strong className="text-sm">{box.battery}%</strong>
            </div>
          </div>
          <div className="border border-slate-100 rounded-xl p-3">
            <div className="text-[10px] text-slate-400 font-semibold">
              LAST UPDATE
            </div>
            <strong className="text-sm block mt-1.5">{box.updated}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
