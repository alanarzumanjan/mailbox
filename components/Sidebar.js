/**
 * Боковая панель диспетчера: выводит сводку по статусам ящиков, интерактивный список
 * с прогресс-барами, кнопку симуляции новых писем и генератор маршрута для курьера.
 */
'use client';

import { useState } from 'react';
import { getBoxStatus, getBoxPercent } from '@/data/initialBoxes';

export default function Sidebar({
  sidebarRef,
  boxes,
  selectedId,
  onSelectBox,
  onSimulateMail,
  onOptimizeRoute,
  routeActive,
}) {
  const [collapsed, setCollapsed] = useState(false);

  const fullCount = boxes.filter((b) => getBoxStatus(b) === 'full').length;
  const normalCount = boxes.filter((b) => getBoxStatus(b) === 'normal').length;

  return (
    <aside
      ref={sidebarRef}
      className={`${
        collapsed ? 'md:w-19' : 'md:w-97.5 xl:w-105'
      } w-full shrink-0 bg-white border-l border-slate-200 flex flex-col min-h-0 relative z-10 transition-all duration-200`}
    >
      {/* Заголовок сайдбара и кнопка сворачивания */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-5 pt-5 pb-3`}>
        {!collapsed && (
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[17px] font-extrabold tracking-tight">Postbox fleet</h1>
              {fullCount > 0 && (
                <span className="text-[10px] bg-rose-50 text-rose-600 border border-rose-100 rounded-full px-2 py-0.5 font-bold">
                  {fullCount} needs attention
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">Live status across the Riga network</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 items-center justify-center cursor-pointer"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d={collapsed ? 'm9 18 6-6-6-6' : 'm15 18-6-6 6-6'} />
          </svg>
        </button>
      </div>

      {/* Счетчики: Всего / Норма / Полные */}
      {!collapsed && (
        <div className="grid grid-cols-3 gap-2 px-5 pb-4">
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
            <div className="text-[10px] text-slate-400 font-semibold">TOTAL</div>
            <div className="text-xl font-extrabold mt-0.5">{String(boxes.length).padStart(2, '0')}</div>
          </div>
          <div className="rounded-xl bg-emerald-50/70 border border-emerald-100/70 px-3 py-2.5">
            <div className="text-[10px] text-emerald-700/70 font-semibold">NORMAL</div>
            <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
              {String(normalCount).padStart(2, '0')}
            </div>
          </div>
          <div className="rounded-xl bg-rose-50/70 border border-rose-100/70 px-3 py-2.5">
            <div className="text-[10px] text-rose-600/70 font-semibold">FULL</div>
            <div className="text-xl font-extrabold text-rose-600 mt-0.5">
              {String(fullCount).padStart(2, '0')}
            </div>
          </div>
        </div>
      )}

      {/* Заголовок списка и кнопка демо-симуляции */}
      <div className="px-5 pb-2 flex items-center justify-between">
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

      {/* Прокручиваемый список ящиков */}
      <div className="scrollbar overflow-y-auto px-3 pb-3 flex-1 space-y-1">
        {boxes.map((box) => {
          const status = getBoxStatus(box);
          const pct = getBoxPercent(box);
          const dotColor =
            status === 'full' ? 'bg-rose-500' : status === 'warning' ? 'bg-amber-400' : 'bg-emerald-500';
          const statusText =
            status === 'full'
              ? 'Pickup required'
              : status === 'warning'
              ? 'Near capacity'
              : 'Operating normally';
          const statusColor =
            status === 'full'
              ? 'text-rose-600'
              : status === 'warning'
              ? 'text-amber-600'
              : 'text-emerald-700';

          return (
            <button
              key={box.id}
              onClick={() => onSelectBox(box.id)}
              className={`w-full text-left flex items-center ${
                collapsed ? 'justify-center px-0' : 'gap-3 px-3'
              } py-3 rounded-xl border ${
                selectedId === box.id
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : 'border-transparent hover:bg-slate-50'
              } transition cursor-pointer`}
            >
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-25 ${
                    status === 'full' ? 'animate-ping' : ''
                  }`}
                />
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dotColor}`} />
              </span>

              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-bold text-slate-800 truncate">{box.name}</span>
                      <span className={`text-[10px] font-bold ${statusColor}`}>{pct}%</span>
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
                      <span className={`text-[10px] ${statusColor} font-semibold whitespace-nowrap`}>
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

      {/* Нижний блок построения маршрута */}
      <div className="border-t border-slate-100 p-5 pt-4">
        {!collapsed && (
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-bold">Courier dispatch</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Collect full boxes in one run</div>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-bold">
              SMART ROUTING
            </span>
          </div>
        )}

        <button
          onClick={onOptimizeRoute}
          className={`w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl ${
            collapsed ? 'py-3 px-2' : 'py-3.5'
          } shadow-lg shadow-emerald-600/15 transition cursor-pointer`}
        >
          <svg className="w-4.25 h-4.25 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h11l-3-3m3 3-3 3M20 17H9l3 3m-3-3 3-3" />
          </svg>
          {!collapsed && <span>Optimize courier route</span>}
        </button>

        {routeActive && !collapsed && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 font-semibold">EST. DISTANCE</div>
              <div className="font-extrabold text-lg mt-0.5">
                12.4 <span className="text-xs font-semibold text-slate-400">km</span>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 font-semibold">FUEL SAVED</div>
              <div className="font-extrabold text-lg text-emerald-600 mt-0.5">
                35<span className="text-xs">%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
