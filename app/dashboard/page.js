/**
 * Главная страница MailGrid: общее состояние (ящики, события IoT, тосты)
 * и переключение между режимами «Courier» (первая страница) и «Dispatcher» (вторая),
 * плюс онбординг-тур.
 * Демо-версия: добавление ящиков убрано, фокус на 3 главных фичах.
 */
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { INITIAL_BOXES } from "@/data/initialBoxes";
import { INITIAL_EVENTS } from "@/data/dispatchData";
import DashboardHeader from "@/components/DashboardHeader";
import DispatcherDashboard from "@/components/DispatcherDashboard";
import CourierApp from "@/components/CourierApp";
import Tour from "@/components/Tour";

export default function DashboardPage() {
  const [boxes, setBoxes] = useState(INITIAL_BOXES);
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [role, setRole] = useState("courier");
  const [toastMessage, setToastMessage] = useState("");
  const [tourOpen, setTourOpen] = useState(false);
  const sidebarRef = useRef(null);
  const toastTimer = useRef(null);
  const eventSeq = useRef(100);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(""), 2800);
  }, []);

  // Добавляет событие в ленту тревог (новые сверху)
  const pushEvent = useCallback(({ type, boxId, message }) => {
    eventSeq.current += 1;
    const time = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const ev = { id: `EV-${eventSeq.current}`, type, boxId, message, time };
    setEvents((prev) => [ev, ...prev].slice(0, 40));
  }, []);

  const closeTour = () => {
    setTourOpen(false);
    try {
      localStorage.setItem("mailgrid_tour_done", "1");
    } catch {}
  };

  return (
    <div className="min-h-screen md:h-screen flex flex-col md:overflow-hidden">
      <DashboardHeader
        role={role}
        onRoleChange={setRole}
        onStartTour={() => setTourOpen(true)}
        onScrollToSidebar={() =>
          sidebarRef.current?.scrollIntoView({ behavior: "smooth" })
        }
      />

      {role === "dispatcher" ? (
        <DispatcherDashboard
          boxes={boxes}
          setBoxes={setBoxes}
          events={events}
          pushEvent={pushEvent}
          showToast={showToast}
        />
      ) : (
        <CourierApp
          boxes={boxes}
          setBoxes={setBoxes}
          pushEvent={pushEvent}
          showToast={showToast}
          sidebarRef={sidebarRef}
        />
      )}

      <Tour open={tourOpen} onClose={closeTour} onRoleChange={setRole} />

      <div
        role="status"
        aria-live="polite"
        className={`fixed top-20.5 right-5 z-1200 transition-all duration-300 bg-slate-900/90 backdrop-blur text-white rounded-xl px-4 py-3 shadow-xl flex items-center gap-2 text-sm pointer-events-none ${
          toastMessage
            ? "translate-y-0 opacity-100"
            : "-translate-y-2 opacity-0"
        }`}
      >
        <span className="text-emerald-300">✓</span>
        <span>{toastMessage}</span>
      </div>
    </div>
  );
}
