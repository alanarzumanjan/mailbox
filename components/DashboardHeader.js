/**
 * Шапка: логотип слева (начало Z), переключатель роли в центре-справа,
 * мобильная кнопка списка для курьера. Никаких лишних подписей.
 */
"use client";

import { HelpCircle } from "lucide-react";
import Link from "next/link";

// Курьер — первая страница, диспетчер — вторая
const ROLES = [
  { id: "courier", label: "Courier" },
  { id: "dispatcher", label: "Dispatcher" },
];

export default function DashboardHeader({
  role,
  onRoleChange,
  onScrollToSidebar,
  onStartTour,
}) {
  const isCourier = role === "courier";

  return (
    <header className="h-17 shrink-0 bg-white border-b border-slate-200/80 flex items-center justify-between px-3 sm:px-5 md:px-7 z-20 gap-2">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-sm shrink-0">
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5"
            fill="none"
            stroke="white"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M4 8.5 12 4l8 4.5v8L12 21l-8-4.5z" />
            <path d="M4.5 8.7 12 13l7.5-4.3M12 13v7.5M8 6.2l8 4.6" />
          </svg>
        </div>
        <Link href="/" className="font-black tracking-tight text-xl hidden sm:block">
          Empty<span className="text-emerald-600">Less</span>
        </Link>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <button
          onClick={onStartTour}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-2.5 rounded-xl transition cursor-pointer"
          aria-label="Start the tour"
        >
          <HelpCircle className="w-5 h-5" />
          <span className="hidden sm:inline">Tour</span>
        </button>

        {/* Переключатель ролей: 2 понятные кнопки */}
        <div
          data-tour="role-tabs"
          role="tablist"
          aria-label="Switch role"
          className="flex bg-slate-100 rounded-xl p-1 text-sm font-bold"
        >
          {ROLES.map((r) => (
            <button
              key={r.id}
              role="tab"
              aria-selected={role === r.id}
              onClick={() => onRoleChange(r.id)}
              className={`px-3.5 sm:px-4 py-2 rounded-lg transition cursor-pointer whitespace-nowrap ${
                role === r.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Список ящиков на телефоне — только для курьера (у диспетчера нет сайдбара) */}
        {isCourier && (
          <button
            onClick={onScrollToSidebar}
            className="md:hidden p-2.5 rounded-lg bg-slate-100 text-slate-600"
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
        )}
      </div>
    </header>
  );
}
