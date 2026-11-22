/**
 * Главная страница MailGrid: общее состояние (ящики, события IoT, тосты)
 * и переключение между режимами «Dispatcher View» и «Courier App».
 */
"use client";

import { useState, useRef, useCallback } from "react";
import { INITIAL_BOXES } from "@/data/initialBoxes";
import { INITIAL_EVENTS } from "@/data/dispatchData";
import Header from "@/components/Header";
import DispatcherDashboard from "@/components/DispatcherDashboard";
import CourierApp from "@/components/CourierApp";
import AddBoxModal from "@/components/AddBoxModal";

export default function DashboardPage() {
  const [boxes, setBoxes] = useState(INITIAL_BOXES);
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [role, setRole] = useState("dispatcher");
  const [modalOpen, setModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const sidebarRef = useRef(null);
  const toastTimer = useRef(null);
  const eventSeq = useRef(100);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(""), 2800);
  }, []);

  // Добавляет событие в ленту Live Telemetry (новые сверху)
  const pushEvent = useCallback(({ type, boxId, message }) => {
    eventSeq.current += 1;
    const time = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const ev = { id: `EV-${eventSeq.current}`, type, boxId, message, time };
    setEvents((prev) => [ev, ...prev].slice(0, 40));
  }, []);

  const handleAddBox = ({ name, address, weight, battery }) => {
    const n = boxes.length + 1;
    const id = `MG-${String(n).padStart(3, "0")}`;
    const angle = n * 2.399;
    const radius = 0.0035 + (n % 3) * 0.001;

    const newBox = {
      id,
      name,
      address,
      district: "centrs",
      lat: 56.9515 + Math.sin(angle) * radius,
      lng: 24.112 + Math.cos(angle) * radius,
      weight,
      max: 2000,
      battery,
      updated: "Just now",
    };

    setBoxes((prev) => [...prev, newBox]);
    pushEvent({
      type: "info",
      boxId: id,
      message: "New postbox registered in the network",
    });
    showToast(`${name} added to the network`);
  };

  return (
    <div className="min-h-screen md:h-screen flex flex-col md:overflow-hidden">
      <Header
        role={role}
        onRoleChange={setRole}
        onOpenModal={() => setModalOpen(true)}
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

      <AddBoxModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAddBox={handleAddBox}
      />

      <div
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
