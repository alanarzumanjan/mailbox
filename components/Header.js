'use client';

import { useState, useEffect } from 'react';

export default function Header({ onOpenModal, onScrollToSidebar }) {
  const [timeText, setTimeText] = useState('Updated just now');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setTimeText(`Updated ${now}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-[68px] shrink-0 bg-white border-b border-slate-200/80 flex items-center justify-between px-5 md:px-7 z-20">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-sm">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="white" strokeWidth="1.8">
            <path d="M4 8.5 12 4l8 4.5v8L12 21l-8-4.5z" />
            <path d="M4.5 8.7 12 13l7.5-4.3M12 13v7.5M8 6.2l8 4.6" />
          </svg>
        </div>
        <div className="leading-tight">
          <div className="font-extrabold tracking-tight text-[17px]">
            Mail<span className="text-emerald-600">Grid</span>
          </div>
          <div className="text-[10px] tracking-[.14em] uppercase text-slate-400 font-semibold">
            Dispatch intelligence
          </div>
        </div>
        <div className="hidden sm:block h-7 w-px bg-slate-200 mx-3" />
        <div className="hidden sm:block text-sm text-slate-500">
          Riga network <span className="text-slate-300 mx-1">/</span>{' '}
          <span className="text-slate-800 font-semibold">Overview</span>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        {/* Горизонтальная легенда статусов вместо System online */}
        <div className="hidden lg:flex items-center gap-4 bg-slate-50 border border-slate-200/60 rounded-xl px-3.5 py-1.5 text-[11px] font-semibold text-slate-600">
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

        <div className="hidden md:block text-xs text-slate-400">{timeText}</div>
        <button
          onClick={onOpenModal}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold px-3.5 py-2.5 rounded-lg shadow-sm transition cursor-pointer"
        >
          <span className="text-lg leading-none">+</span>
          <span>Add new postbox</span>
        </button>
        <button
          onClick={onScrollToSidebar}
          className="md:hidden p-2 text-slate-500"
          aria-label="Show postboxes"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  );
}
