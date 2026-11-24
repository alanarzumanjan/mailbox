/**
 * Шапка: логотип слева (начало Z), переключатель роли в центре-справа,
 * одна главная кнопка справа. Никаких лишних подписей.
 */
"use client";

const ROLES = [
  { id: "dispatcher", label: "Dispatcher" },
  { id: "courier", label: "Courier" },
];

export default function Header({
  role,
  onRoleChange,
  onOpenModal,
  onScrollToSidebar,
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
        <div className="font-black tracking-tight text-xl hidden sm:block">
          Mail<span className="text-emerald-600">Grid</span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Переключатель ролей: 2 понятные кнопки */}
        <div
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

        {!isCourier && (
          <button
            onClick={onOpenModal}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-3.5 sm:px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
            aria-label="Add postbox"
          >
            <span className="text-lg leading-none">+</span>
            <span className="hidden sm:inline">Add postbox</span>
          </button>
        )}

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
