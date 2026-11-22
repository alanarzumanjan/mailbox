/**
 * Панель диспетчера: KPI, таблица ящиков с фильтрами срочности, Live Telemetry,
 * статус смены и курьеров, экспорт отчёта. Без карты — главное это данные.
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
  Mailbox,
  AlertTriangle,
  Gauge,
  BatteryLow,
  Timer,
  Truck,
} from "lucide-react";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "critical", label: "Critical (Full)" },
  { id: "warning", label: "Warning (>75%)" },
  { id: "battery", label: "Low Battery" },
];

const STATUS_STYLE = {
  full: {
    label: "Critical",
    badge: "bg-rose-50 text-rose-600 border-rose-100",
    bar: "bg-rose-500",
    text: "text-rose-600",
  },
  warning: {
    label: "Warning",
    badge: "bg-amber-50 text-amber-600 border-amber-100",
    bar: "bg-amber-400",
    text: "text-amber-600",
  },
  normal: {
    label: "Normal",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-100",
    bar: "bg-emerald-500",
    text: "text-emerald-700",
  },
};

const EVENT_DOT = {
  critical: "bg-rose-500",
  warning: "bg-amber-400",
  info: "bg-sky-500",
  success: "bg-emerald-500",
};

const COURIER_STATUS = {
  en_route: {
    label: "En route",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700",
  },
  at_pickup: {
    label: "At pickup",
    dot: "bg-sky-500",
    pill: "bg-sky-50 text-sky-700",
  },
  break: {
    label: "On break",
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
  rose: "bg-rose-50 text-rose-600",
  amber: "bg-amber-50 text-amber-600",
  emerald: "bg-emerald-50 text-emerald-600",
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

function Skel({ className = "" }) {
  return (
    <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />
  );
}

function Kpi({ label, value, sub, tone = "slate", icon: Icon }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm px-4 py-3.5 transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] uppercase tracking-[.12em] font-bold text-slate-400 pt-1">
          {label}
        </div>
        {Icon && (
          <span
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${KPI_ICON_TONE[tone]}`}
          >
            <Icon className="w-4 h-4" strokeWidth={2} />
          </span>
        )}
      </div>
      <div
        className={`text-2xl font-extrabold tracking-tight mt-1.5 ${KPI_ICON_TONE[tone]} bg-transparent`}
      >
        {value}
      </div>
      <div className="text-[11px] text-slate-400 mt-0.5 truncate">{sub}</div>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
        <svg
          className="w-7 h-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="12" r="9" />
          <path
            d="m8 12.5 2.8 2.8L16 9.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="font-extrabold text-slate-800">{title}</div>
      <div className="text-sm text-slate-400 mt-1 max-w-xs">{text}</div>
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
  const [district, setDistrict] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [live, setLive] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(null);

  const boxesRef = useRef(boxes);
  boxesRef.current = boxes;

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

      if (roll < 0.4 && getBoxStatus(box) !== "full") {
        const jump = Math.round(10 + Math.random() * 30);
        const newWeight = Math.min(
          box.max,
          box.weight + Math.round((box.max * jump) / 100),
        );
        const nowFull = newWeight >= box.max;
        setBoxes((prev) =>
          prev.map((b) =>
            b.id === box.id
              ? { ...b, weight: newWeight, updated: "Just now" }
              : b,
          ),
        );
        pushEvent({
          type: nowFull ? "critical" : "warning",
          boxId: box.id,
          message: nowFull
            ? "Capacity reached (100%) — pickup required"
            : `Rapid fill detected (+${jump}% in the last hour)`,
        });
      } else if (roll < 0.7) {
        pushEvent({
          type: "info",
          boxId: box.id,
          message: "Lid opened · sensor check",
        });
      } else {
        const level = Math.max(
          5,
          box.battery - (2 + Math.floor(Math.random() * 5)),
        );
        setBoxes((prev) =>
          prev.map((b) =>
            b.id === box.id ? { ...b, battery: level, updated: "Just now" } : b,
          ),
        );
        pushEvent({
          type: level <= LOW_BATTERY_THRESHOLD ? "warning" : "info",
          boxId: box.id,
          message:
            level <= LOW_BATTERY_THRESHOLD
              ? `Low battery (${level}%) — service needed`
              : `Battery level ${level}%`,
        });
      }
    }, 8000);
    return () => clearInterval(timer);
  }, [loading, live, pushEvent, setBoxes]);

  // ───────── Производные данные ─────────
  const scoped = useMemo(
    () =>
      district === "all"
        ? boxes
        : boxes.filter((b) => getBoxDistrict(b) === district),
    [boxes, district],
  );

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
  const districtLabel = DISTRICTS.find((d) => d.id === district)?.label;

  const emptyCopy = (() => {
    const where = district === "all" ? "" : " in this district";
    if (filter === "critical")
      return {
        title: `All clear${where}!`,
        text: "No pending pickups right now.",
      };
    if (filter === "warning")
      return {
        title: "Nothing near capacity",
        text: `No postboxes above 75%${where}.`,
      };
    if (filter === "battery")
      return {
        title: "Batteries healthy",
        text: `No low-battery sensors${where}.`,
      };
    return {
      title: "No postboxes found",
      text: "Try another district or add a new postbox.",
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
      body: events
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
      `}</style>

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-8 py-6 space-y-6">
        {/* Заголовок и действия */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[.14em] font-bold text-slate-400">
              Operations center · Riga
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight mt-1">
              Dispatch overview
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {SHIFT_STATS.shiftLabel}
            </p>
          </div>

          <div className="flex items-center gap-2 relative">
            <button
              onClick={handleSimulateMail}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-3.5 py-2.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              <span className="text-base leading-none">＋</span>
              Simulate incoming mail
            </button>

            <button
              onClick={() => setExportOpen((o) => !o)}
              disabled={loading || !!exporting}
              className="inline-flex items-center gap-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-700 px-3.5 py-2.5 rounded-lg shadow-sm transition-all disabled:opacity-60 cursor-pointer"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {exporting ? "Generating…" : "Export dispatch report"}
            </button>

            {exportOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setExportOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-60 z-20 bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-xl overflow-hidden mg-slide-in">
                  <button
                    onClick={() => handleExport("csv")}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="text-sm font-bold">Download CSV</div>
                    <div className="text-[11px] text-slate-400">
                      Spreadsheet · all postboxes
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport("pdf")}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-t border-slate-100 cursor-pointer"
                  >
                    <div className="text-sm font-bold">Download PDF</div>
                    <div className="text-[11px] text-slate-400">
                      Shift summary report
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200/80 px-4 py-3.5"
              >
                <div className="flex items-start justify-between">
                  <Skel className="h-3 w-20" />
                  <Skel className="h-8 w-8" />
                </div>
                <Skel className="h-7 w-14 mt-3" />
                <Skel className="h-3 w-24 mt-2" />
              </div>
            ))
          ) : (
            <>
              <Kpi
                icon={Mailbox}
                label="Postboxes"
                value={String(net.total).padStart(2, "0")}
                sub="Registered in network"
              />
              <Kpi
                icon={AlertTriangle}
                label="Critical"
                value={String(net.critical).padStart(2, "0")}
                sub="Full · pickup required"
                tone={net.critical ? "rose" : "emerald"}
              />
              <Kpi
                icon={Gauge}
                label="Warning"
                value={String(net.warning).padStart(2, "0")}
                sub="Above 75% capacity"
                tone={net.warning ? "amber" : "slate"}
              />
              <Kpi
                icon={BatteryLow}
                label="Low battery"
                value={String(net.battery).padStart(2, "0")}
                sub={`At or below ${LOW_BATTERY_THRESHOLD}%`}
                tone={net.battery ? "amber" : "slate"}
              />
              <Kpi
                icon={Timer}
                label="Avg response time"
                value={`${avgResponseMin} min`}
                sub={`Target ≤ ${targetResponseMin} min`}
                tone={responseOk ? "emerald" : "amber"}
              />
              <Kpi
                icon={Truck}
                label="Couriers on line"
                value={`${activeCouriers} of ${COURIERS.length}`}
                sub="Active this shift"
              />
            </>
          )}
        </div>

        <div className="grid xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
          {/* ───── Таблица ящиков ───── */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-slate-100 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-extrabold text-[17px] tracking-tight">
                    Postbox status
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sorted by urgency
                    {district !== "all" ? ` · ${districtLabel}` : ""}
                  </p>
                </div>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition cursor-pointer"
                  aria-label="Filter by district"
                >
                  {DISTRICTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-full border transition-all cursor-pointer ${
                      filter === f.id
                        ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {f.label}
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
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
              <div className="p-5 space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skel className="h-9 w-40" />
                    <Skel className="h-3 flex-1" />
                    <Skel className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : rows.length === 0 ? (
              <EmptyState title={emptyCopy.title} text={emptyCopy.text} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[.12em] font-bold text-slate-400 border-b border-slate-100">
                      <th className="px-5 py-3 font-bold">Postbox</th>
                      <th className="px-3 py-3 font-bold">District</th>
                      <th className="px-3 py-3 font-bold w-[200px]">
                        Fill level
                      </th>
                      <th className="px-3 py-3 font-bold">Battery</th>
                      <th className="px-3 py-3 font-bold">Status</th>
                      <th className="px-5 py-3 font-bold">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((box) => {
                      const status = getBoxStatus(box);
                      const pct = getBoxPercent(box);
                      const st = STATUS_STYLE[status];
                      const lowBattery = box.battery <= LOW_BATTERY_THRESHOLD;
                      return (
                        <tr
                          key={box.id}
                          onClick={() => setSelectedId(box.id)}
                          className={`border-b border-slate-50 last:border-0 transition-all cursor-pointer ${
                            selectedId === box.id
                              ? "bg-emerald-50/50"
                              : "hover:bg-slate-50/80"
                          }`}
                        >
                          <td className="px-5 py-3.5">
                            <div className="font-mono text-[11px] font-bold uppercase text-slate-400">
                              {box.id}
                            </div>
                            <div className="text-[13px] font-extrabold text-slate-800 mt-0.5">
                              {box.name}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[220px]">
                              {box.address}
                            </div>
                          </td>
                          <td className="px-3 py-3.5 text-xs text-slate-500">
                            {
                              DISTRICTS.find(
                                (d) => d.id === getBoxDistrict(box),
                              )?.label
                            }
                          </td>
                          <td className="px-3 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${st.bar}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span
                                className={`text-xs font-extrabold w-9 text-right ${st.text}`}
                              >
                                {pct}%
                              </span>
                            </div>
                            <div className="font-mono text-[10px] text-slate-400 mt-1">
                              {box.weight.toLocaleString("en-US")}g /{" "}
                              {box.max.toLocaleString("en-US")}g
                            </div>
                          </td>
                          <td className="px-3 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                                lowBattery ? "text-rose-600" : "text-slate-600"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${lowBattery ? "bg-rose-500" : "bg-emerald-500"}`}
                              />
                              {box.battery}%
                            </span>
                          </td>
                          <td className="px-3 py-3.5">
                            <span
                              className={`inline-block text-[10px] uppercase tracking-wider font-bold border rounded-full px-2.5 py-1 ${st.badge}`}
                            >
                              {st.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                            {box.updated}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ───── Правая колонка ───── */}
          <div className="space-y-6">
            {/* Shift & Fleet Status */}
            <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-extrabold text-[17px] tracking-tight">
                  Shift &amp; fleet status
                </h2>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-bold uppercase tracking-wider">
                  Live
                </span>
              </div>

              {loading ? (
                <div className="mt-4 space-y-3">
                  <Skel className="h-6 w-40" />
                  <Skel className="h-2 w-full" />
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skel key={i} className="h-11 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="mt-4">
                    <div className="text-xl font-extrabold tracking-tight">
                      {activeCouriers} of {COURIERS.length}{" "}
                      <span className="text-sm font-semibold text-slate-400">
                        couriers active
                      </span>
                    </div>
                    <div className="flex gap-1 mt-2.5">
                      {COURIERS.map((c) => (
                        <div
                          key={c.id}
                          className={`h-1.5 flex-1 rounded-full transition-all ${
                            c.status === "en_route" || c.status === "at_pickup"
                              ? "bg-emerald-500"
                              : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-3.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] uppercase tracking-[.12em] font-bold text-slate-400">
                        Average response time
                      </span>
                      <span
                        className={`text-lg font-extrabold ${responseOk ? "text-emerald-600" : "text-amber-600"}`}
                      >
                        {avgResponseMin} min
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${responseOk ? "bg-emerald-500" : "bg-amber-400"}`}
                        style={{
                          width: `${Math.min(100, (avgResponseMin / targetResponseMin) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1.5">
                      Target ≤ {targetResponseMin} min · from fill alert to
                      pickup
                    </div>
                  </div>

                  <ul className="mt-3 divide-y divide-slate-100">
                    {COURIERS.map((c) => {
                      const cs = COURIER_STATUS[c.status];
                      const initials = c.name
                        .split(" ")
                        .map((p) => p[0])
                        .join("");
                      return (
                        <li key={c.id} className="flex items-center gap-3 py-3">
                          <div className="w-9 h-9 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-bold text-slate-800 truncate">
                              {c.name}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              <span className="font-mono uppercase">
                                {c.id}
                              </span>{" "}
                              · {c.note}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={`inline-flex items-center gap-1.5 text-[10px] font-bold rounded-full px-2 py-1 ${cs.pill}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${cs.dot}`}
                              />
                              {cs.label}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-1">
                              {c.pickups} pickups
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </section>

            {/* Live Telemetry & Alerts */}
            <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div>
                  <h2 className="font-extrabold text-[17px] tracking-tight">
                    Live telemetry &amp; alerts
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    IoT sensor events · {events.length} logged
                  </p>
                </div>
                <button
                  onClick={() => setLive((v) => !v)}
                  className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full px-3 py-1.5 transition-all cursor-pointer"
                >
                  <span className="relative flex h-2 w-2">
                    {live && (
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${live ? "bg-emerald-500" : "bg-slate-300"}`}
                    />
                  </span>
                  {live ? "Live · Pause" : "Paused · Resume"}
                </button>
              </div>

              {loading ? (
                <div className="px-5 pb-5 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skel key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : events.length === 0 ? (
                <EmptyState
                  title="No events yet"
                  text="Sensor events will appear here in real time."
                />
              ) : (
                <ul className="max-h-[420px] overflow-y-auto scrollbar border-t border-slate-100">
                  {events.map((ev) => (
                    <li
                      key={ev.id}
                      className="mg-slide-in flex gap-3 px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors"
                    >
                      <span
                        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${EVENT_DOT[ev.type]}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-bold uppercase text-slate-400">
                            {ev.boxId}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {ev.time}
                          </span>
                        </div>
                        <p className="text-[13px] text-slate-700 leading-snug mt-0.5">
                          {ev.message}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>

      <DetailDrawer box={selectedBox} onClose={() => setSelectedId(null)} />
    </div>
  );
}
