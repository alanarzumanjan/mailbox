/**
- Мобильное приложение курьера: карта, маршрут по районам,
- экран «Mark as Collected». Действия попадают в ленту диспетчера.
 */
"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { getBoxStatus } from "@/data/initialBoxes";
import { DISTRICTS, getBoxDistrict } from "@/data/districts";
import Sidebar from "@/components/Sidebar";
import CourierPickupSheet from "@/components/CourierPickupSheet";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function CourierApp({
  boxes,
  setBoxes,
  pushEvent,
  showToast,
  sidebarRef,
}) {
  const [selectedId, setSelectedId] = useState(null);
  const [routeRequested, setRouteRequested] = useState(false); // Заменили routeActive на флаг намерения
  const [routeDistance, setRouteDistance] = useState(0);
  const [district, setDistrict] = useState("all");

  const visibleBoxes = useMemo(
    () =>
      district !== "all"
        ? boxes.filter((b) => getBoxDistrict(b) === district)
        : boxes,
    [boxes, district],
  );

  const fullRoutePoints = useMemo(
    () =>
      visibleBoxes
        .filter((b) => getBoxStatus(b) === "full")
        .sort((a, b) => a.lng - b.lng),
    [visibleBoxes],
  );

  // Маршрут активен только если курьер его запросил И есть полные точки
  const routeActive = routeRequested && fullRoutePoints.length > 0;

  const selectedBox = boxes.find((b) => b.id === selectedId) || null;
  const viewTarget = DISTRICTS.find((d) => d.id === district) || null;

  // Убран useEffect, вызывающий setState синхронно.
  // Если fullRoutePoints.length стал 0, routeActive автоматически станет false.

  const handleDistrictChange = (id) => {
    setDistrict(id);
    setSelectedId(null);
  };

  const handleSimulateMail = () => {
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
    pushEvent({
      type: "critical",
      boxId: target.id,
      message: "Capacity reached (100%) — pickup required",
    });
    setSelectedId(target.id);
    showToast(`${target.name} is full — pickup required`);
  };

  const handleOptimizeRoute = () => {
    if (fullRoutePoints.length === 0) {
      showToast("No full postboxes — route not needed");
      return;
    }
    setRouteRequested(true);
    showToast(
      `Optimized route ready · ${fullRoutePoints.length} full stop${fullRoutePoints.length === 1 ? "" : "s"}`,
    );
  };

  // Курьер приехал к точке (клик по маркеру или GPS)
  const handleArrive = (id) => {
    const box = boxes.find((b) => b.id === id);
    if (!box) return;
    setSelectedId(id);
    showToast(`Arrived at ${box.name}`);
  };

  const handleCollect = (id) => {
    const box = boxes.find((b) => b.id === id);
    if (!box) return;

    setBoxes((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, weight: 0, updated: "Just now" } : b,
      ),
    );
    pushEvent({
      type: "success",
      boxId: id,
      message: "Pickup confirmed — mailbox emptied",
    });
    setSelectedId(null);

    const remaining = fullRoutePoints.filter((b) => b.id !== id).length;

    // Если собрали последний ящик, сбрасываем флаг запроса маршрута
    if (remaining === 0) {
      setRouteRequested(false);
      setRouteDistance(0);
    }

    showToast(
      remaining > 0
        ? `${box.name} collected · ${remaining} stop${remaining === 1 ? "" : "s"} left, route updated`
        : `${box.name} collected · all pickups done`,
    );
  };

  return (
    <>
      <main className="flex flex-col md:flex-row flex-1 min-h-0 md:overflow-hidden">
        <MapView
          boxes={visibleBoxes}
          selectedId={selectedId}
          onSelectBox={setSelectedId}
          routePoints={fullRoutePoints}
          routeActive={routeActive}
          onDistanceCalculated={setRouteDistance}
          viewTarget={viewTarget}
          courierMode
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
          role="courier"
          districts={DISTRICTS}
          district={district}
          onDistrictChange={handleDistrictChange}
        />
      </main>

      <CourierPickupSheet
        box={selectedBox}
        onClose={() => setSelectedId(null)}
        onCollect={handleCollect}
      />
    </>
  );
}
