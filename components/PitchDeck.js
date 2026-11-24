"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle, Gauge, CheckCircle2, BatteryLow, Truck, Route, Radio,
  ArrowRight, Wifi, Snowflake, Coins, Cpu, Users, Play, MapPin, Fuel,
} from "lucide-react";

/* Брендовые цвета Latvijas Pasts */
const Y = "#FFCC00";
const Y2 = "#FDB913";
const INK = "#1A1F2C";
const STORAGE_KEY = "mg-pitch-slide";

/* ---------- мелкие кирпичики (тот же язык, что в дашборде: rounded-2xl, font-black, статусные цвета) ---------- */

const TONE = {
  rose: { bg: "bg-rose-100", fg: "text-rose-600", bar: "bg-rose-500" },
  amber: { bg: "bg-amber-100", fg: "text-amber-600", bar: "bg-amber-400" },
  emerald: { bg: "bg-emerald-100", fg: "text-emerald-600", bar: "bg-emerald-500" },
  slate: { bg: "bg-slate-100", fg: "text-slate-600", bar: "bg-slate-400" },
};

function Kpi({ icon: Icon, value, label, tone = "slate" }) {
  const t = TONE[tone];
  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200/70 p-5 flex items-center gap-4 text-slate-900">
      <span className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${t.bg} ${t.fg}`}>
        <Icon className="w-7 h-7" strokeWidth={2.2} />
      </span>
      <span>
        <span className={`block text-4xl font-black leading-none ${t.fg}`}>{value}</span>
        <span className="block text-lg text-slate-500 mt-1.5">{label}</span>
      </span>
    </div>
  );
}

function BoxRow({ name, pct, tone, label }) {
  const t = TONE[tone];
  return (
    <div className="flex items-center gap-4 bg-white rounded-xl px-4 py-3 text-slate-900">
      <span className={`w-3.5 h-3.5 rounded-full ${t.bar}`} />
      <span className="w-52 text-xl font-bold truncate">{name}</span>
      <span className="h-3 flex-1 rounded-full bg-slate-100 overflow-hidden">
        <span className={`block h-full rounded-full ${t.bar}`} style={{ width: `${pct}%` }} />
      </span>
      <span className={`w-16 text-right text-xl font-black ${t.fg}`}>{pct}%</span>
      <span className={`w-32 text-right text-base font-bold ${t.fg}`}>{label}</span>
    </div>
  );
}

function Title({ children, dark }) {
  return (
    <h2
      className="text-[68px] leading-[1.05] font-black tracking-tight max-w-[1650px]"
      style={{ color: dark ? "#fff" : INK }}
    >
      {children}
    </h2>
  );
}

/* ---------- слайды ---------- */

function Slide1() {
  return (
    <div className="h-full grid grid-cols-[1fr_820px] gap-16 items-center px-24" style={{ background: INK }}>
      <div>
        <span className="inline-block rounded-full px-6 py-3 text-2xl font-extrabold mb-10" style={{ background: Y, color: INK }}>
          Challenge by Latvijas Pasts
        </span>
        <h1 className="text-[190px] leading-none font-black tracking-tight" style={{ color: Y }}>MailGrid</h1>
        <p className="text-[38px] leading-snug text-white/90 mt-10 font-medium">
          Интеллектуальная IoT-платформа для управления логистикой почтовых ящиков Latvijas Pasts:
          от слепого расписания к выемке по реальному спросу.
        </p>
      </div>
      {/* макет дашборда */}
      <div className="rounded-3xl p-6 space-y-4 bg-slate-100 shadow-2xl rotate-1">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500 text-white text-4xl font-black flex items-center justify-center">3</div>
          <div>
            <div className="text-3xl font-black text-slate-900">3 pickups to do</div>
            <div className="text-lg text-slate-500">Across the Riga network</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Kpi icon={AlertTriangle} value="3" label="Full" tone="rose" />
          <Kpi icon={Gauge} value="5" label="Almost full" tone="amber" />
        </div>
        <div className="rounded-2xl overflow-hidden h-44 relative" style={{ background: "#dfe7ee" }}>
          {[[18, 30, "rose"], [42, 62, "rose"], [66, 28, "amber"], [78, 66, "emerald"], [30, 74, "emerald"], [56, 44, "amber"]].map(([x, y, c], i) => (
            <span key={i} className={`absolute w-6 h-6 rounded-full border-4 border-white shadow ${TONE[c].bar}`} style={{ left: `${x}%`, top: `${y}%` }} />
          ))}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points="18,30 42,62 56,44 66,28" fill="none" stroke={INK} strokeWidth="1.2" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
        <BoxRow name="Origo" pct={96} tone="rose" label="Full" />
        <BoxRow name="Brīvības iela" pct={78} tone="amber" label="Almost full" />
        <BoxRow name="Āgenskalns" pct={12} tone="emerald" label="OK" />
      </div>
    </div>
  );
}

function Slide2() {
  const cards = [
    { big: "620", unit: "ящиков", text: "обслуживаются по жёсткому графику; диспетчер не знает статус ящика, пока курьер не откроет замок.", icon: Truck },
    { big: "-14,2%", unit: "писем в год", text: "трафик падает неравномерно: курьеры тратят топливо и часы на пустые ящики в регионах, пока точки в центре переполняются.", icon: BatteryLow },
    { big: "«Наугад»", unit: "решения", text: "при оптимизации сети (например, демонтаже 112 ящиков) нет точных исторических данных о реальном спросе.", icon: AlertTriangle },
  ];
  return (
    <div className="h-full px-24 py-20 flex flex-col justify-between bg-slate-50">
      <Title>620 почтовых ящиков вслепую — до <span className="px-4 rounded-2xl" style={{ background: Y }}>60%</span> холостых выездов</Title>
      <div className="grid grid-cols-3 gap-10">
        {cards.map((c, i) => (
          <div key={i} className="bg-white rounded-3xl border-2 border-slate-200 p-10 shadow-sm">
            <span className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8" style={{ background: INK, color: Y }}>
              <c.icon className="w-10 h-10" strokeWidth={2.2} />
            </span>
            <div className="text-[84px] leading-none font-black" style={{ color: INK }}>{c.big}</div>
            <div className="text-4xl font-extrabold text-rose-600 mt-2">{c.unit}</div>
            <p className="text-[28px] leading-snug text-slate-600 mt-6">{c.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Slide3({ onOpenDemo }) {
  const steps = [
    { icon: Radio, t: "IoT-датчик в ящике", d: "вес писем и заряд батареи" },
    { icon: Route, t: "OSRM-маршрутизатор", d: "отсеивает пустые точки, строит короткий путь к заполненным" },
    { icon: Truck, t: "Диспетчер + Курьер", d: "карта в реальном времени, аналитика спроса, выемка в 1 клик" },
  ];
  const rows = [
    ["Выезды к пустым ящикам", "До 60% маршрута впустую", "0% — едем только к заполненным"],
    ["Топливо и выбросы CO₂", "100% базового пробега", "-30–40% на одном маршруте"],
    ["Планирование сети ящиков", "Субъективные оценки", "Тепловая карта спроса 24/7"],
  ];
  return (
    <div className="h-full px-24 py-14 flex flex-col justify-between" style={{ background: INK }}>
      <Title dark>MailGrid: выемка почты <span style={{ color: Y }}>по факту заполнения</span></Title>
      <div className="flex items-stretch gap-6">
        {steps.map((s, i) => (
          <div key={i} className="contents">
            <div className="flex-1 rounded-3xl bg-white/10 border border-white/20 p-8">
              <span className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: Y, color: INK }}>
                <s.icon className="w-8 h-8" strokeWidth={2.4} />
              </span>
              <div className="text-[34px] font-black text-white">{s.t}</div>
              <div className="text-[24px] text-white/70 mt-2 leading-snug">{s.d}</div>
            </div>
            {i < 2 && <ArrowRight className="w-14 h-14 self-center shrink-0" style={{ color: Y }} strokeWidth={3} />}
          </div>
        ))}
      </div>
      <div className="rounded-3xl overflow-hidden bg-white text-[26px]">
        <div className="grid grid-cols-[1.1fr_1fr_1.2fr] font-black text-xl uppercase tracking-wide">
          <div className="px-8 py-3 bg-slate-100 text-slate-500">Показатель</div>
          <div className="px-8 py-3 bg-rose-100 text-rose-700">Было</div>
          <div className="px-8 py-3 bg-emerald-100 text-emerald-700">Стало</div>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1.1fr_1fr_1.2fr] border-t border-slate-100">
            <div className="px-8 py-3 font-bold text-slate-900">{r[0]}</div>
            <div className="px-8 py-3 text-rose-600 font-semibold">{r[1]}</div>
            <div className="px-8 py-3 text-emerald-700 font-black">{r[2]}</div>
          </div>
        ))}
      </div>
      <button
        onClick={onOpenDemo}
        className="self-center inline-flex items-center gap-4 rounded-3xl px-14 py-6 text-[40px] font-black shadow-xl transition active:scale-[0.98] cursor-pointer"
        style={{ background: Y, color: INK }}
      >
        <Play className="w-9 h-9 fill-current" /> Перейти к живому демо <ArrowRight className="w-10 h-10" strokeWidth={3} />
      </button>
    </div>
  );
}

function Slide4() {
  const steps = [
    { tone: "emerald", icon: CheckCircle2, status: "OK", t: "Мониторинг сети", d: "заполнение и заряд батареи по всем ящикам" },
    { tone: "amber", icon: Gauge, status: "Almost full", t: "Порог веса", d: "мгновенный алерт при превышении порога" },
    { tone: "rose", icon: Route, status: "Full", t: "Новый маршрут", d: "OSRM пересчитывает путь: экономия км, топлива и CO₂" },
    { tone: "emerald", icon: Truck, status: "Выемка", t: "Подтверждение", d: "курьер подтверждает забор, данные идут в аналитику сети" },
  ];
  return (
    <div className="h-full px-24 py-20 flex flex-col justify-between bg-slate-50">
      <Title>Как это работает вживую</Title>
      <div className="grid grid-cols-4 gap-8">
        {steps.map((s, i) => {
          const t = TONE[s.tone];
          return (
            <div key={i} className="bg-white rounded-3xl border-2 border-slate-200 p-8 relative">
              <div className="text-xl font-black text-slate-300 absolute top-6 right-8">0{i + 1}</div>
              <span className={`w-20 h-20 rounded-2xl flex items-center justify-center ${t.bg} ${t.fg}`}>
                <s.icon className="w-10 h-10" strokeWidth={2.2} />
              </span>
              <span className={`inline-block mt-6 text-xl font-bold border-2 rounded-full px-5 py-1.5 ${t.fg} border-current`}>{s.status}</span>
              <div className="text-[34px] font-black mt-5" style={{ color: INK }}>{s.t}</div>
              <p className="text-[24px] text-slate-600 mt-3 leading-snug">{s.d}</p>
              <div className={`h-3 rounded-full mt-8 ${t.bar}`} style={{ width: `${(i + 1) * 25}%` }} />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-2xl text-slate-500 font-semibold">
        <span className="w-4 h-4 rounded-full bg-emerald-500" /> OK
        <span className="w-4 h-4 rounded-full bg-amber-400 ml-4" /> Almost full
        <span className="w-4 h-4 rounded-full bg-rose-500 ml-4" /> Full
        <span className="ml-auto">Демо: кнопка «Demo: fill a postbox»</span>
      </div>
    </div>
  );
}

function Slide5() {
  const cards = [
    { icon: Coins, big: "~€20", t: "себестоимость модуля при серии", d: "тензодатчик веса + ИК-сенсор объёма + плата" },
    { icon: Wifi, big: "NB-IoT / LoRaWAN", t: "связь сквозь металлический корпус", d: "стабильный сигнал даже в отдалённых регионах Латвии", small: true },
    { icon: Snowflake, big: "До 3 лет", t: "от одной батареи", d: "глубокий сон (связь 2 раза в сутки), работа при −25°C" },
  ];
  return (
    <div className="h-full px-24 py-20 flex flex-col justify-between" style={{ background: INK }}>
      <Title dark>Продумано для <span style={{ color: Y }}>латвийского климата</span> и масштабирования</Title>
      <div className="grid grid-cols-3 gap-10">
        {cards.map((c, i) => (
          <div key={i} className="rounded-3xl bg-white/10 border border-white/20 p-10">
            <span className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8" style={{ background: Y, color: INK }}>
              <c.icon className="w-10 h-10" strokeWidth={2.4} />
            </span>
            <div className={`${c.small ? "text-[58px]" : "text-[96px]"} leading-none font-black`} style={{ color: Y }}>{c.big}</div>
            <div className="text-[34px] font-extrabold text-white mt-6">{c.t}</div>
            <p className="text-[26px] text-white/70 mt-3 leading-snug">{c.d}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 text-2xl text-white/60 font-semibold"><Cpu className="w-8 h-8" /> Один модуль на ящик — без замены инфраструктуры</div>
    </div>
  );
}

function Slide6() {
  const tl = [
    ["Недели 1–2", "Установка 30 датчиков на одном смешанном маршруте (центр Риги + пригород)."],
    ["Недели 3–6", "Сбор данных и параллельное сравнение OSRM-маршрутов с контрольной группой."],
    ["Недели 7–8", "Отчёт по экономии топлива и CO₂, рекомендации по переносу невостребованных ящиков."],
  ];
  return (
    <div className="h-full px-24 py-20 flex flex-col justify-between bg-slate-50">
      <Title>Окупаемость за <span className="px-4 rounded-2xl" style={{ background: Y }}>4–6 месяцев</span> и запуск пилота за 8 недель</Title>
      <div className="grid grid-cols-[640px_1fr] gap-12">
        <div className="rounded-3xl p-12 flex flex-col justify-center" style={{ background: INK }}>
          <div className="text-3xl font-bold text-white/70">ROI датчика</div>
          <div className="text-[150px] leading-none font-black mt-2" style={{ color: Y }}>4–6</div>
          <div className="text-5xl font-black text-white">мес.</div>
          <p className="text-[26px] text-white/80 mt-8 leading-snug">окупаемость только за счёт сокращения холостого пробега и рабочих часов курьеров на 30%.</p>
        </div>
        <div className="space-y-6">
          {tl.map(([w, d], i) => (
            <div key={i} className="flex gap-8 bg-white rounded-3xl border-2 border-slate-200 p-8 items-center">
              <span className="w-20 h-20 rounded-2xl text-4xl font-black flex items-center justify-center shrink-0" style={{ background: Y, color: INK }}>{i + 1}</span>
              <div>
                <div className="text-[38px] font-black" style={{ color: INK }}>{w}</div>
                <p className="text-[26px] text-slate-600 leading-snug mt-1">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Slide7() {
  const stack = ["Next.js", "React", "Tailwind CSS", "lucide-react", "OSRM", "IoT / MQTT"];
  return (
    <div className="h-full px-24 py-16 flex flex-col justify-between" style={{ background: INK }}>
      <Title dark>MailGrid — логистика Latvijas Pasts <span style={{ color: Y }}>на основе данных</span></Title>
      <div className="flex flex-wrap gap-4">
        {stack.map((s) => (
          <span key={s} className="rounded-full px-7 py-3 text-[28px] font-extrabold" style={{ background: Y, color: INK }}>{s}</span>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-8">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="rounded-3xl bg-white/10 border border-white/20 p-8 flex flex-col items-center text-center">
            <span className="w-28 h-28 rounded-full flex items-center justify-center mb-5" style={{ background: Y, color: INK }}>
              <Users className="w-14 h-14" />
            </span>
            <div className="text-[34px] font-black text-white">Имя Фамилия</div>
            <div className="text-[24px] text-white/60 mt-1">Роль</div>
          </div>
        ))}
      </div>
      <div className="rounded-3xl px-12 py-8 text-center text-[46px] font-black leading-tight" style={{ background: Y, color: INK }}>
        Готовы запустить пилот на 30 ящиках в Риге в следующем месяце.
      </div>
    </div>
  );
}

const SLIDES = [Slide1, Slide2, Slide3, Slide4, Slide5, Slide6, Slide7];

/* ---------- оболочка: 16:9 сцена 1920×1080, масштабируется на весь экран ---------- */

export default function PitchDeck({ onOpenDemo }) {
  const [i, setI] = useState(0);
  const [scale, setScale] = useState(1);
  const last = SLIDES.length - 1;

  useEffect(() => {
    try {
      const saved = parseInt(sessionStorage.getItem(STORAGE_KEY) ?? "", 10);
      if (saved >= 0 && saved <= last) setI(saved);
    } catch {}
  }, [last]);

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, String(i)); } catch {}
  }, [i]);

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const next = useCallback(() => setI((v) => Math.min(v + 1, last)), [last]);
  const prev = useCallback(() => setI((v) => Math.max(v - 1, 0)), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key.toLowerCase() === "d") onOpenDemo?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onOpenDemo]);

  const Current = SLIDES[i];

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black flex items-center justify-center">
      <div className="relative shrink-0 overflow-hidden" style={{ width: 1920, height: 1080, transform: `scale(${scale})` }}>
        <Current onOpenDemo={onOpenDemo} />
        <div className="absolute bottom-6 right-8 rounded-full px-5 py-2 text-2xl font-black bg-black/40 text-white/90 backdrop-blur">
          {i + 1} / {SLIDES.length}
        </div>
      </div>
    </div>
  );
}
