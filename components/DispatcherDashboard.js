/**
 * Панель диспетчера. Читается по Z-паттерну за 2 секунды:
 *  1) слева сверху — главный вердикт («3 ящика полны»), справа сверху — действие;
 *  2) ниже — 4 карточки-счётчика (они же фильтры таблицы);
 *  3) внизу — список срочных ящиков и справа курьеры + последние тревоги.
 * Закон Миллера: на экране ≤ 7 объектов в каждой группе, остальное — «Show all».
 */
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { getBoxStatus, getBoxPercent } from "@/data/initialBoxes";
import { DISTRICTS, getBoxDistrict } from "@/data/districts";
import {
  COURIERS,
  SHIFT_STATS,
  LOW_BATTERY_THRESHOLD,
} from "@/data/dispatchData";
import DetailDrawer from "@/components/DetailDrawer";
import {
  AlertTriangle,
  Gauge,
  BatteryLow,
  Truck,
  CheckCircle2,
  Download,
  ChevronDown,
  Play,
} from "lucide-react";

const VISIBLE_ROWS = 7; // Миллер: 7 ± 2
const VISIBLE_EVENTS = 5;

const FILTERS = [
  { id: "all", label: "All" },
  { id: "critical", label: "Full" },
  { id: "warning", label: "Almost full" },
  { id: "battery", label: "Low battery" },
];

// Простые слова вместо терминов: Full / Almost full / OK
const STATUS_STYLE = {
  full: {
    label: "Full",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    bar: "bg-rose-500",
    text: "text-rose-600",
    iconBox: "bg-rose-100 text-rose-600",
    icon: AlertTriangle,
  },
  warning: {
    label: "Almost full",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    bar: "bg-amber-400",
    text: "text-amber-600",
    iconBox: "bg-amber-100 text-amber-600",
    icon: Gauge,
  },
  normal: {
    label: "OK",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    bar: "bg-emerald-500",
    text: "text-emerald-700",
    iconBox: "bg-emerald-100 text-emerald-600",
    icon: CheckCircle2,
  },
};

// Иконка и цвет для каждого типа события в ленте
const EVENT_STYLE = {
  critical: {
    icon: AlertTriangle,
    box: "bg-rose-100 text-rose-600",
  },
  warning: {
    icon: BatteryLow,
    box: "bg-amber-100 text-amber-600",
  },
  success: {
    icon: CheckCircle2,
    box: "bg-emerald-100 text-emerald-600",
  },
};

const COURIER_STATUS = {
  en_route: {
    label: "Driving",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700",
  },
  at_pickup: {
    label: "Collecting",
    dot: "bg-sky-500",
    pill: "bg-sky-50 text-sky-700",
  },
  break: {
    label: "Break",
    dot: "bg-amber-400",
    pill: "bg-amber-50 text-amber-700",
  },
  offline: {
    label: "Offline",
    dot: "bg-slate-300",
    pill: "bg-slate-100 text-slate-500",
  },
};

const KPI_ICON_TONE = {
  slate: "bg-slate-100 text-slate-600",
  rose: "bg-rose-100 text-rose-600",
  amber: "bg-amber-100 text-amber-600",
  emerald: "bg-emerald-100 text-emerald-600",
};

const KPI_VALUE_TONE = {
  slate: "text-slate-900",
  rose: "text-rose-600",
  amber: "text-amber-600",
  emerald: "text-emerald-600",
};

const pdfText = (v) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, (ch) => (ch === "·" ? "-" : ""));

const matchesFilter = (box, filter) => {
  if (filter === "critical") return getBoxStatus(box) === "full";
  if (filter === "warning") return getBoxStatus(box) === "warning";
  if (filter === "battery") return box.battery <= LOW_BATTERY_THRESHOLD;
  return true;
};

const STATUS_RANK = { full: 0, warning: 1, normal: 2 };

// В ленте оставляем только важное: полный ящик, низкий заряд, подтверждённый забор
const isAlert = (ev) =>
  ev.type === "critical" ||
  ev.type === "success" ||
  (ev.type === "warning" && /battery/i.test(ev.message));

function Skel({ className = "" }) {
  return (
    <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />
  );
}

// Карточка-счётчик: иконка + крупное число + одно простое слово.
// Если передан onClick — карточка работает как фильтр таблицы.
function Kpi({ label, value, tone = "slate", icon: Icon, onClick, active }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      aria-pressed={onClick ? !!active : undefined}
      className={`text-left bg-white rounded-2xl border-2 p-4 sm:p-5 flex items-center gap-4 transition ${
        active ? "border-slate-900" : "border-slate-200/70"
      } ${onClick ? "cursor-pointer hover:shadow-md" : ""}`}
    >
      <span
        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${KPI_ICON_TONE[tone]}`}
      >
        <Icon className="w-6 h-6" strokeWidth={2.2} />
      </span>
      <span className="min-w-0">
        <span
          className={`block text-3xl font-black leading-none tracking-tight ${KPI_VALUE_TONE[tone]}`}
        >
          {value}
        </span>
        <span className="block text-sm text-slate-500 mt-1.5 truncate">
          {label}
        </span>
      </span>
    </Tag>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-7 h-7" />
      </div>
      <div className="font-extrabold text-lg text-slate-800">{title}</div>
      <div className="text-sm text-slate-500 mt-1 max-w-xs">{text}</div>
    </div>
  );
}

export default function DispatcherDashboard({
  boxes,
  setBoxes,
  events,
  pushEvent,
  showToast,
}) {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [live, setLive] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(null);

  const boxesRef = useRef(boxes);

  useEffect(() => {
    boxesRef.current = boxes;
  }, [boxes]);

  // Имитация загрузки данных (скелетоны)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  // Live-телеметрия: «умные датчики» присылают события и меняют состояние ящиков
  useEffect(() => {
    if (loading || !live) return;
    const timer = setInterval(() => {
      const list = boxesRef.current;
      if (!list.length) return;
      const box = list[Math.floor(Math.random() * list.length)];
      const roll = Math.random();

      if (roll < 0.65 && getBoxStatus(box) !== "full") {
        // Ящик наполняется; в ленту попадает только момент «полный»
        const jump = Math.round(10 + Math.random() * 30);
        const newWeight = Math.min(
          box.max,
          box.weight + Math.round((box.max * jump) / 100),
        );
        setBoxes((prev) =>
          prev.map((b) =>
            b.id === box.id
              ? { ...b, weight: newWeight, updated: "Just now" }
              : b,
          ),
        );
        if (newWeight >= box.max) {
          pushEvent({
            type: "critical",
            boxId: box.id,
            message: "Capacity reached (100%) — pickup required",
          });
        }
      } else {
        // Заряд датчика падает; в ленту — только если стал низким
        const level = Math.max(
          5,
          box.battery - (2 + Math.floor(Math.random() * 5)),
        );
        setBoxes((prev) =>
          prev.map((b) =>
            b.id === box.id ? { ...b, battery: level, updated: "Just now" } : b,
          ),
        );
        if (
          level <= LOW_BATTERY_THRESHOLD &&
          box.battery > LOW_BATTERY_THRESHOLD
        ) {
          pushEvent({
            type: "warning",
            boxId: box.id,
            message: `Low battery (${level}%) — service needed`,
          });
        }
      }
    }, 8000);
    return () => clearInterval(timer);
  }, [loading, live, pushEvent, setBoxes]);

  const [showAll, setShowAll] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);

  // ───────── Производные данные ─────────
  const scoped = boxes;

  const rows = useMemo(
    () =>
      scoped
        .filter((b) => matchesFilter(b, filter))
        .sort(
          (a, b) =>
            STATUS_RANK[getBoxStatus(a)] - STATUS_RANK[getBoxStatus(b)] ||
            b.weight / b.max - a.weight / a.max,
        ),
    [scoped, filter],
  );

  const counts = useMemo(
    () => ({
      all: scoped.length,
      critical: scoped.filter((b) => matchesFilter(b, "critical")).length,
      warning: scoped.filter((b) => matchesFilter(b, "warning")).length,
      battery: scoped.filter((b) => matchesFilter(b, "battery")).length,
    }),
    [scoped],
  );

  const net = {
    total: boxes.length,
    critical: boxes.filter((b) => getBoxStatus(b) === "full").length,
    warning: boxes.filter((b) => getBoxStatus(b) === "warning").length,
    battery: boxes.filter((b) => b.battery <= LOW_BATTERY_THRESHOLD).length,
  };

  const activeCouriers = COURIERS.filter(
    (c) => c.status === "en_route" || c.status === "at_pickup",
  ).length;
  const { avgResponseMin, targetResponseMin } = SHIFT_STATS;
  const responseOk = avgResponseMin <= targetResponseMin;

  const selectedBox = boxes.find((b) => b.id === selectedId) || null;

  const visibleRows = showAll ? rows : rows.slice(0, VISIBLE_ROWS);
  const alerts = events.filter(isAlert);
  const visibleEvents = showAllEvents
    ? alerts
    : alerts.slice(0, VISIBLE_EVENTS);
  const nameOf = (id) => boxes.find((b) => b.id === id)?.name ?? "System";

  const toggleFilter = (id) => setFilter((f) => (f === id ? "all" : id));

  // Главный вердикт — то, что читается в первую очередь
  const headline =
    net.critical > 0
      ? `${net.critical === 1 ? "1 postbox is" : `${net.critical} postboxes are`} full`
      : "All postboxes are fine";
  const subline =
    net.critical > 0
      ? "Send a courier to empty them"
      : "No pickups needed right now";

  const emptyCopy = (() => {
    const where = "";
    if (filter === "critical")
      return {
        title: `All clear${where}!`,
        text: "No postboxes are waiting for pickup.",
      };
    if (filter === "warning")
      return {
        title: "Nothing is almost full",
        text: `No postboxes above 75%${where}.`,
      };
    if (filter === "battery")
      return {
        title: "Batteries are fine",
        text: `No sensors need charging${where}.`,
      };
    return {
      title: "No postboxes here",
      text: "Postboxes will show up here.",
    };
  })();

  // ───────── Действия ─────────
  const handleSimulateMail = () => {
    const candidates = boxes
      .filter((b) => getBoxStatus(b) !== "full")
      .sort((a, b) => b.weight / b.max - a.weight / a.max);
    if (candidates.length === 0) {
      showToast("All postboxes are already full");
      return;
    }
    const target = candidates[0];
    setBoxes((prev) =>
      prev.map((b) =>
        b.id === target.id ? { ...b, weight: b.max, updated: "Just now" } : b,
      ),
    );
    pushEvent({
      type: "critical",
      boxId: target.id,
      message: "Capacity reached (100%) — pickup required",
    });
    showToast(`${target.name} is full — pickup required`);
  };

  const downloadCsv = () => {
    const header = [
      "ID",
      "Name",
      "Address",
      "District",
      "Weight (g)",
      "Capacity (g)",
      "Fill %",
      "Status",
      "Battery %",
      "Updated",
    ];
    const body = boxes.map((b) => [
      b.id,
      b.name,
      b.address,
      DISTRICTS.find((d) => d.id === getBoxDistrict(b))?.label || "",
      b.weight,
      b.max,
      getBoxPercent(b),
      STATUS_STYLE[getBoxStatus(b)].label,
      b.battery,
      b.updated,
    ]);
    const csv = [header, ...body]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mailgrid-dispatch-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    // Библиотеки грузятся только при экспорте, чтобы не раздувать основной бандл
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    const now = new Date();

    const STATUS_RGB = {
      full: [225, 29, 72],
      warning: [217, 119, 6],
      normal: [5, 150, 105],
    };

    // Шапка отчёта
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 78, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("MailGrid", margin, 36);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Dispatch Report - Riga network", margin, 54);
    doc.text(
      pdfText(
        `Generated ${now.toLocaleDateString("en-GB")} ${now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
      ),
      pageW - margin,
      36,
      { align: "right" },
    );
    doc.text(pdfText(SHIFT_STATS.shiftLabel), pageW - margin, 54, {
      align: "right",
    });

    // Сводка (KPI)
    const kpis = [
      ["Postboxes", String(net.total)],
      ["Critical", String(net.critical)],
      ["Warning", String(net.warning)],
      ["Low battery", String(net.battery)],
      ["Avg response", `${avgResponseMin} min`],
      ["Couriers", `${activeCouriers} of ${COURIERS.length}`],
    ];
    const gap = 8;
    const cardW = (pageW - margin * 2 - gap * (kpis.length - 1)) / kpis.length;
    kpis.forEach(([label, value], i) => {
      const x = margin + i * (cardW + gap);
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(x, 96, cardW, 52, 6, 6, "F");
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text(label.toUpperCase(), x + 8, 112);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.text(value, x + 8, 135);
    });

    // Таблица ящиков (сначала самые срочные)
    const sorted = [...boxes].sort(
      (a, b) =>
        STATUS_RANK[getBoxStatus(a)] - STATUS_RANK[getBoxStatus(b)] ||
        b.weight / b.max - a.weight / a.max,
    );

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Postbox status", margin, 176);

    autoTable(doc, {
      startY: 184,
      margin: { left: margin, right: margin },
      head: [
        [
          "ID",
          "Postbox",
          "District",
          "Weight",
          "Fill",
          "Battery",
          "Status",
          "Updated",
        ],
      ],
      body: sorted.map((b) => [
        b.id,
        pdfText(b.name),
        pdfText(DISTRICTS.find((d) => d.id === getBoxDistrict(b))?.label),
        `${b.weight} / ${b.max} g`,
        `${getBoxPercent(b)}%`,
        `${b.battery}%`,
        STATUS_STYLE[getBoxStatus(b)].label,
        pdfText(b.updated),
      ]),
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 5,
        textColor: [51, 65, 85],
      },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const box = sorted[data.row.index];
        if (data.column.index === 6) {
          data.cell.styles.textColor = STATUS_RGB[getBoxStatus(box)];
          data.cell.styles.fontStyle = "bold";
        }
        if (data.column.index === 5 && box.battery <= LOW_BATTERY_THRESHOLD) {
          data.cell.styles.textColor = STATUS_RGB.full;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    // Курьеры смены
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 28,
      margin: { left: margin, right: margin },
      head: [["Courier", "Name", "Zone", "Status", "Pickups", "Note"]],
      body: COURIERS.map((c) => [
        c.id,
        pdfText(c.name),
        pdfText(c.zone),
        COURIER_STATUS[c.status].label,
        String(c.pickups),
        pdfText(c.note),
      ]),
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 5,
        textColor: [51, 65, 85],
      },
      headStyles: { fillColor: [5, 150, 105], textColor: 255, fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didDrawPage: undefined,
    });

    // Последние события телеметрии
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 28,
      margin: { left: margin, right: margin },
      head: [["Time", "Postbox", "Event"]],
      body: alerts
        .slice(0, 15)
        .map((e) => [e.time, e.boxId, pdfText(e.message)]),
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 5,
        textColor: [51, 65, 85],
      },
      headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    // Нижний колонтитул с номерами страниц
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("MailGrid - Dispatch intelligence", margin, pageH - 20);
      doc.text(`Page ${i} of ${pages}`, pageW - margin, pageH - 20, {
        align: "right",
      });
    }

    doc.save(`mailgrid-dispatch-report-${now.toISOString().slice(0, 10)}.pdf`);
  };

  const handleExport = async (kind) => {
    setExportOpen(false);
    setExporting(kind);
    try {
      // Небольшая пауза, чтобы кнопка успела показать «Generating…»
      await new Promise((r) => setTimeout(r, 600));
      if (kind === "csv") downloadCsv();
      else await downloadPdf();

      showToast(`${kind.toUpperCase()} report generated successfully`);
      pushEvent({
        type: "info",
        boxId: "SYSTEM",
        message: `Dispatch report exported (${kind.toUpperCase()})`,
      });
    } catch (err) {
      console.error("Report export failed:", err);
      showToast("Could not generate the report");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex-1 min-h-0 md:overflow-y-auto scrollbar bg-slate-50">
      <style>{`
        @keyframes mgSlideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
        .mg-slide-in { animation: mgSlideIn .35s ease-out; }
        @media (prefers-reduced-motion: reduce) { .mg-slide-in { animation: none; } }
      `}</style>

      <div className="max-w-375 mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 space-y-6 md:space-y-8">
        {/* ① Z-паттерн: вердикт слева сверху, действия справа сверху */}
        <section
          data-tour="dispatch-verdict"
          className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"
        >
          {loading ? (
            <div className="flex items-center gap-5">
              <Skel className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl" />
              <div className="space-y-3">
                <Skel className="h-9 w-64 sm:w-96" />
                <Skel className="h-5 w-48" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 sm:gap-5 min-w-0">
              <div
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center shrink-0 text-white text-5xl sm:text-6xl font-black ${
                  net.critical > 0 ? "bg-rose-500" : "bg-emerald-500"
                }`}
                aria-hidden="true"
              >
                {net.critical > 0 ? (
                  net.critical
                ) : (
                  <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                  {headline}
                </h1>
                <p className="text-base sm:text-lg text-slate-500 mt-1">
                  {subline}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 relative shrink-0">
            <button
              onClick={handleSimulateMail}
              disabled={loading}
              className="inline-flex items-center gap-2 text-sm font-extrabold text-amber-900 bg-amber-100 hover:bg-amber-200 border-2 border-dashed border-amber-400 px-4 py-3 rounded-xl transition disabled:opacity-50 cursor-pointer"
              title="Demo: a postbox fills up right now"
            >
              <Play className="w-4 h-4 fill-current" />
              Demo: fill a postbox
            </button>

            <button
              onClick={() => setExportOpen((o) => !o)}
              disabled={loading || !!exporting}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-4 py-3 rounded-xl transition disabled:opacity-60 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              {exporting ? "Preparing…" : "Report"}
            </button>

            {exportOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setExportOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-64 z-20 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden mg-slide-in">
                  <button
                    onClick={() => handleExport("pdf")}
                    className="w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="text-sm font-bold">PDF document</div>
                    <div className="text-xs text-slate-500">
                      Nice summary to print or share
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport("csv")}
                    className="w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors border-t border-slate-100 cursor-pointer"
                  >
                    <div className="text-sm font-bold">Spreadsheet (CSV)</div>
                    <div className="text-xs text-slate-500">
                      All postboxes, open in Excel
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ② Четыре счётчика — они же фильтры (Миллер: ≤ 4) */}
        <section
          aria-label="Summary"
          className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4"
        >
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border-2 border-slate-200/70 p-5 flex items-center gap-4"
              >
                <Skel className="w-12 h-12 rounded-2xl" />
                <div className="space-y-2">
                  <Skel className="h-7 w-12" />
                  <Skel className="h-4 w-20" />
                </div>
              </div>
            ))
          ) : (
            <>
              <Kpi
                icon={AlertTriangle}
                label="Full"
                value={net.critical}
                tone={net.critical ? "rose" : "emerald"}
                active={filter === "critical"}
                onClick={() => toggleFilter("critical")}
              />
              <Kpi
                icon={Gauge}
                label="Almost full"
                value={net.warning}
                tone={net.warning ? "amber" : "slate"}
                active={filter === "warning"}
                onClick={() => toggleFilter("warning")}
              />
              <Kpi
                icon={BatteryLow}
                label="Low battery"
                value={net.battery}
                tone={net.battery ? "amber" : "slate"}
                active={filter === "battery"}
                onClick={() => toggleFilter("battery")}
              />
              <Kpi
                icon={Truck}
                label="Couriers on duty"
                value={`${activeCouriers}/${COURIERS.length}`}
                tone="emerald"
              />
            </>
          )}
        </section>

        <div className="grid xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
          {/* ③ Список ящиков: самые срочные сверху */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-slate-100 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-extrabold text-xl tracking-tight">
                  Postboxes
                  <span className="ml-2 text-sm font-semibold text-slate-400">
                    most urgent first
                  </span>
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full border transition cursor-pointer ${
                      filter === f.id
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {f.label}
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        filter === f.id
                          ? "bg-white/20"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {counts[f.id]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="p-5 space-y-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skel className="h-11 w-11 rounded-xl" />
                    <Skel className="h-5 w-40" />
                    <Skel className="h-3 flex-1" />
                    <Skel className="h-8 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : rows.length === 0 ? (
              <EmptyState title={emptyCopy.title} text={emptyCopy.text} />
            ) : (
              <>
                <ul className="divide-y divide-slate-100">
                  {visibleRows.map((box) => {
                    const status = getBoxStatus(box);
                    const pct = getBoxPercent(box);
                    const st = STATUS_STYLE[status];
                    const StatusIcon = st.icon;
                    const lowBattery = box.battery <= LOW_BATTERY_THRESHOLD;
                    return (
                      <li key={box.id}>
                        <button
                          onClick={() => setSelectedId(box.id)}
                          className={`w-full text-left grid grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-cols-[auto_minmax(0,1.2fr)_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-5 py-4 transition cursor-pointer ${
                            selectedId === box.id
                              ? "bg-emerald-50/60"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${st.iconBox}`}
                          >
                            <StatusIcon className="w-5 h-5" strokeWidth={2.2} />
                          </span>

                          <span className="min-w-0">
                            <span className="block text-base font-extrabold text-slate-900 truncate">
                              {box.name}
                            </span>
                            <span className="block text-sm text-slate-500 truncate">
                              {box.address}
                            </span>
                            {lowBattery && (
                              <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold text-rose-600">
                                <BatteryLow className="w-3.5 h-3.5" />
                                Battery {box.battery}%
                              </span>
                            )}
                          </span>

                          <span className="col-span-3 order-last sm:order-none sm:col-span-1 flex items-center gap-3">
                            <span className="h-3 flex-1 rounded-full bg-slate-100 overflow-hidden">
                              <span
                                className={`block h-full rounded-full transition-all duration-500 ${st.bar}`}
                                style={{ width: `${pct}%` }}
                              />
                            </span>
                            <span
                              className={`w-12 text-right text-lg font-black ${st.text}`}
                            >
                              {pct}%
                            </span>
                          </span>

                          <span
                            className={`inline-block text-sm font-bold border rounded-full px-3 py-1.5 whitespace-nowrap ${st.badge}`}
                          >
                            {st.label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {rows.length > VISIBLE_ROWS && (
                  <button
                    onClick={() => setShowAll((v) => !v)}
                    className="w-full flex items-center justify-center gap-2 py-4 text-sm font-bold text-slate-600 hover:bg-slate-50 border-t border-slate-100 transition cursor-pointer"
                  >
                    {showAll ? "Show fewer" : `Show all ${rows.length}`}
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${showAll ? "rotate-180" : ""}`}
                    />
                  </button>
                )}
              </>
            )}
          </section>

          {/* ④ Правая колонка: курьеры → последние тревоги */}
          <div className="space-y-6">
            <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
              <h2 className="font-extrabold text-xl tracking-tight">
                Couriers
              </h2>

              {loading ? (
                <div className="mt-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skel key={i} className="h-11 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <ul className="mt-2 divide-y divide-slate-100">
                    {COURIERS.map((c) => {
                      const cs = COURIER_STATUS[c.status];
                      const initials = c.name
                        .split(" ")
                        .map((p) => p[0])
                        .join("");
                      return (
                        <li key={c.id} className="flex items-center gap-3 py-3">
                          <div className="w-10 h-10 rounded-full bg-slate-900 text-white text-sm font-bold flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[15px] font-bold text-slate-900 truncate">
                              {c.name}
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1.5 text-sm font-bold rounded-full px-3 py-1 ${cs.pill}`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${cs.dot}`}
                            />
                            {cs.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  <div
                    className={`mt-3 rounded-xl px-4 py-3 flex items-center justify-between ${
                      responseOk
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    <span className="text-sm font-semibold">
                      Average response
                    </span>
                    <span className="text-lg font-black">
                      {avgResponseMin} min
                    </span>
                  </div>
                </>
              )}
            </section>

            <section
              data-tour="alerts"
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h2 className="font-extrabold text-xl tracking-tight">
                  Latest alerts
                </h2>
                <button
                  onClick={() => setLive((v) => !v)}
                  className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full px-3 py-1.5 transition cursor-pointer"
                  aria-label={
                    live ? "Pause live updates" : "Resume live updates"
                  }
                >
                  <span className="relative flex h-2.5 w-2.5">
                    {live && (
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${live ? "bg-emerald-500" : "bg-slate-300"}`}
                    />
                  </span>
                  {live ? "Live" : "Paused"}
                </button>
              </div>

              {loading ? (
                <div className="px-5 pb-5 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skel key={i} className="h-11 w-full" />
                  ))}
                </div>
              ) : alerts.length === 0 ? (
                <EmptyState
                  title="No alerts yet"
                  text="Sensor news will show up here."
                />
              ) : (
                <>
                  <ul
                    className={`border-t border-slate-100 ${showAllEvents ? "max-h-105 overflow-y-auto scrollbar" : ""}`}
                  >
                    {visibleEvents.map((ev) => {
                      const es = EVENT_STYLE[ev.type] ?? EVENT_STYLE.warning;
                      const EventIcon = es.icon;
                      return (
                        <li
                          key={ev.id}
                          className="mg-slide-in flex items-center gap-3 px-5 py-3.5 border-b border-slate-50 last:border-0"
                        >
                          <span
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${es.box}`}
                          >
                            <EventIcon className="w-5 h-5" strokeWidth={2.2} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-[15px] font-bold text-slate-900 truncate">
                                {nameOf(ev.boxId)}
                              </span>
                              <span className="text-xs text-slate-400 shrink-0">
                                {ev.time}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 leading-snug mt-0.5">
                              {ev.message}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {alerts.length > VISIBLE_EVENTS && (
                    <button
                      onClick={() => setShowAllEvents((v) => !v)}
                      className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50 border-t border-slate-100 transition cursor-pointer"
                    >
                      {showAllEvents
                        ? "Show fewer"
                        : `Show all ${alerts.length}`}
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${showAllEvents ? "rotate-180" : ""}`}
                      />
                    </button>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      </div>

      <DetailDrawer box={selectedBox} onClose={() => setSelectedId(null)} />
    </div>
  );
}
