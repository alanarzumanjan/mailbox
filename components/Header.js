"use client";

import { useState, useEffect } from "react";

const ROLES = [
  { id: "dispatcher", full: "Dispatcher View", short: "Dispatcher" },
  { id: "courier", full: "Courier App", short: "Courier" },
];

export default function Header({
  role,
  onRoleChange,
  onOpenModal,
  onScrollToSidebar,
}) {
  const [timeText, setTimeText] = useState("Updated just now");
  const isCourier = role === "courier";

  useEffect(() => {
    const updateClock = () => {
      const now = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setTimeText(`Updated ${now}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-[68px] shrink-0 bg-white border-b border-slate-200/80 flex items-center justify-between px-3 sm:px-5 md:px-7 z-20 gap-2">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-sm shrink-0">
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5"
            fill="none"
            stroke="white"
            strokeWidth="1.8"
          >
            <path d="M4 8.5 12 4l8 4.5v8L12 21l-8-4.5z" />
            <path d="M4.5 8.7 12 13l7.5-4.3M12 13v7.5M8 6.2l8 4.6" />
          </svg>
        </div>
        <div className="leading-tight hidden sm:block">
          <div className="font-extrabold tracking-tight text-[17px]">
            Mail<span className="text-emerald-600">Grid</span>
          </div>
          <div className="text-[10px] tracking-[.14em] uppercase text-slate-400 font-semibold">
            Dispatch intelligence
          </div>
        </div>
        <div className="hidden lg:block h-7 w-px bg-slate-200 mx-3" />
        <div className="hidden lg:block text-sm text-slate-500">
          Riga network <span className="text-slate-300 mx-1">/</span>{" "}
          <span className="text-slate-800 font-semibold">
            {isCourier ? "Courier route" : "Overview"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden xl:flex items-center gap-4 bg-slate-50 border border-slate-200/60 rounded-xl px-3.5 py-1.5 text-[11px] font-semibold text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Normal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Warning
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Full
          </span>
        </div>

        <div className="hidden xl:block text-xs text-slate-400">{timeText}</div>

        {/* Переключатель ролей */}
        <div
          role="tablist"
          aria-label="Switch role"
          className="flex bg-slate-100 rounded-lg p-0.5 text-xs font-semibold"
        >
          {ROLES.map((r) => (
            <button
              key={r.id}
              role="tab"
              aria-selected={role === r.id}
              onClick={() => onRoleChange(r.id)}
              className={`px-2.5 sm:px-3 py-2 rounded-md transition cursor-pointer whitespace-nowrap ${
                role === r.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="hidden sm:inline">{r.full}</span>
              <span className="sm:hidden">{r.short}</span>
            </button>
          ))}
        </div>

        {!isCourier && (
          <button
            onClick={onOpenModal}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold px-3 sm:px-3.5 py-2.5 rounded-lg shadow-sm transition cursor-pointer"
          >
            <span className="text-lg leading-none">+</span>
            <span className="hidden sm:inline">Add new postbox</span>
          </button>
        )}

        <button
          onClick={onScrollToSidebar}
          className="md:hidden p-2 text-slate-500"
          aria-label="Show postboxes"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  );
}
