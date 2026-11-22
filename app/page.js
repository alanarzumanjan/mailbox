/**
 * Главная страница дашборда MailGrid: управляет состоянием ящиков, ролями (диспетчер / курьер),
 * фильтром районов, маршрутом и отметкой «Забрано» с автоматическим пересчётом пути.
 */
"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { INITIAL_BOXES, getBoxStatus } from "@/data/initialBoxes";
import { DISTRICTS, getBoxDistrict } from "@/data/districts";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import DetailDrawer from "@/components/DetailDrawer";
import CourierPickupSheet from "@/components/CourierPickupSheet";
import AddBoxModal from "@/components/AddBoxModal";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function DashboardPage() {
  const [boxes, setBoxes] = useState(INITIAL_BOXES);
  const [selectedId, setSelectedId] = useState(null);
  const [routeActive, setRouteActive] = useState(false);
  const [routeDistance, setRouteDistance] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [role, setRole] = useState("dispatcher");
  const [district, setDistrict] = useState("all");
  const sidebarRef = useRef(null);

  const isCourier = role === "courier";

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2800);
  };

  // Ящики, видимые в списке и маршруте: у курьера — только выбранный район
  const visibleBoxes = useMemo(
    () =>
      isCourier && district !== "all"
        ? boxes.filter((b) => getBoxDistrict(b) === district)
        : boxes,
    [boxes, isCourier, district],
  );

  const fullRoutePoints = useMemo(
    () =>
      visibleBoxes
        .filter((b) => getBoxStatus(b) === "full")
        .sort((a, b) => a.lng - b.lng),
    [visibleBoxes],
  );

  const selectedBox = boxes.find((b) => b.id === selectedId) || null;
  // У диспетчера всегда показываем всю Ригу, у курьера — выбранный район
  const viewTarget =
    DISTRICTS.find((d) => d.id === (isCourier ? district : "all")) || null;
  // Если полных ящиков не осталось — маршрут выключаем
  useEffect(() => {
    if (routeActive && fullRoutePoints.length === 0) {
      setRouteActive(false);
      setRouteDistance(0);
    }
  }, [routeActive, fullRoutePoints.length]);

  const handleRoleChange = (nextRole) => {
    setRole(nextRole);
    setRouteActive(false);
    setRouteDistance(0);
    setSelectedId(null);
    if (nextRole === "dispatcher") setDistrict("all");
  };

  const handleDistrictChange = (id) => {
    setDistrict(id);
    setSelectedId(null);
  };

  const handleSimulateMail = () => {
    // visibleBoxes = только ящики выбранного района (у диспетчера — все)
    const candidates = visibleBoxes
      .filter((b) => getBoxStatus(b) !== "full")
      .sort((a, b) => b.weight / b.max - a.weight / a.max);

    if (candidates.length === 0) {
      showToast("All postboxes in this zone are already full");
      return;
    }

    const target = candidates[0];
    setBoxes((prev) =>
      prev.map((b) =>
        b.id === target.id ? { ...b, weight: b.max, updated: "Just now" } : b,
      ),
    );
    setSelectedId(target.id);
    showToast(`${target.name} is full — pickup required`);
  };

  const handleOptimizeRoute = () => {
    if (fullRoutePoints.length === 0) {
      showToast("No full postboxes — route not needed");
      return;
    }
    setRouteActive(true);
    showToast(
      `Optimized route ready · ${fullRoutePoints.length} full stop${fullRoutePoints.length === 1 ? "" : "s"}`,
    );
  };

  // Курьер приехал к точке (по кнопке или по GPS)
  const handleArrive = (id) => {
    const box = boxes.find((b) => b.id === id);
    if (!box) return;
    setSelectedId(id);
    showToast(`Arrived at ${box.name}`);
  };

  // Кнопка «Mark as Collected»: сбрасываем вес, маршрут пересчитается сам
  const handleCollect = (id) => {
    const box = boxes.find((b) => b.id === id);
    if (!box) return;

    setBoxes((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, weight: 0, updated: "Just now" } : b,
      ),
    );
    setSelectedId(null);

    const remaining = fullRoutePoints.filter((b) => b.id !== id).length;
    showToast(
      remaining > 0
        ? `${box.name} collected · ${remaining} stop${remaining === 1 ? "" : "s"} left, route updated`
        : `${box.name} collected · all pickups done`,
    );
  };

  const handleAddBox = ({ name, address, weight, battery }) => {
    const n = boxes.length + 1;
    const id = `MG-${String(n).padStart(3, "0")}`;
    const angle = n * 2.399;
    const radius = 0.0035 + (n % 3) * 0.001;

    const newBox = {
      id,
      name,
      address,
      lat: 56.9515 + Math.sin(angle) * radius,
      lng: 24.112 + Math.cos(angle) * radius,
      weight,
      max: 2000,
      battery,
      updated: "Just now",
    };

    setBoxes((prev) => [...prev, newBox]);
    setSelectedId(id);
    showToast(`${name} added to the network`);
  };

  return (
    <div className="min-h-screen md:h-screen flex flex-col md:overflow-hidden">
      {" "}
      <Header
        role={role}
        onRoleChange={handleRoleChange}
        onOpenModal={() => setModalOpen(true)}
        onScrollToSidebar={() =>
          sidebarRef.current?.scrollIntoView({ behavior: "smooth" })
        }
      />
      <main className="flex flex-col md:flex-row flex-1 min-h-0 md:overflow-hidden">
        {" "}
        <MapView
          boxes={visibleBoxes}
          selectedId={selectedId}
          onSelectBox={setSelectedId}
          routePoints={fullRoutePoints}
          routeActive={routeActive}
          onDistanceCalculated={setRouteDistance}
          viewTarget={viewTarget}
          courierMode={isCourier}
          onArrive={handleArrive}
        />
        <Sidebar
          sidebarRef={sidebarRef}
          boxes={visibleBoxes}
          selectedId={selectedId}
          onSelectBox={setSelectedId}
          onSimulateMail={handleSimulateMail}
          onOptimizeRoute={handleOptimizeRoute}
          routeActive={routeActive}
          routePoints={fullRoutePoints}
          routeDistance={routeDistance}
          role={role}
          districts={DISTRICTS}
          district={district}
          onDistrictChange={handleDistrictChange}
          onArrive={handleArrive}
        />
      </main>
      {isCourier ? (
        <CourierPickupSheet
          box={selectedBox}
          onClose={() => setSelectedId(null)}
          onCollect={handleCollect}
        />
      ) : (
        <DetailDrawer box={selectedBox} onClose={() => setSelectedId(null)} />
      )}
      <AddBoxModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAddBox={handleAddBox}
      />
      <div
        className={`fixed top-[82px] right-5 z-[1200] transition-all duration-300 bg-slate-900 text-white rounded-xl px-4 py-3 shadow-xl flex items-center gap-2 text-sm pointer-events-none ${
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
