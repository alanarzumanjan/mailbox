'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { INITIAL_BOXES, getBoxStatus } from '@/data/initialBoxes';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import DetailDrawer from '@/components/DetailDrawer';
import AddBoxModal from '@/components/AddBoxModal';

// Leaflet использует объект window, поэтому отключаем SSR для компонента карты
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function DashboardPage() {
  const [boxes, setBoxes] = useState(INITIAL_BOXES);
  const [selectedId, setSelectedId] = useState(null);
  const [routeActive, setRouteActive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const sidebarRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2800);
  };

  // Симуляция поступления писем в первый незаполненный ящик (для живого демо на сцене)
  const handleSimulateMail = () => {
    const target = boxes.find((b) => getBoxStatus(b) !== 'full') || boxes[0];
    const updatedBoxes = boxes.map((b) =>
      b.id === target.id ? { ...b, weight: b.max, updated: 'Just now' } : b
    );
    setBoxes(updatedBoxes);
    setSelectedId(target.id);
    showToast(`${target.name} is full — pickup required`);
  };

  // Построение маршрута только по заполненным ящикам
  const handleOptimizeRoute = () => {
    const fullBoxes = boxes.filter((b) => getBoxStatus(b) === 'full');
    if (fullBoxes.length === 0) {
      showToast('No full postboxes — route not needed');
      return;
    }
    setRouteActive(true);
    showToast(`Optimized route ready · ${fullBoxes.length} full stop${fullBoxes.length === 1 ? '' : 's'}`);
  };

  // Добавление нового ящика через модальное окно
  const handleAddBox = ({ name, address, weight, battery }) => {
    const n = boxes.length + 1;
    const id = `MG-${String(n).padStart(3, '0')}`;
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
      updated: 'Just now',
    };

    setBoxes((prev) => [...prev, newBox]);
    setSelectedId(id);
    showToast(`${name} added to the network`);
  };

  const selectedBox = boxes.find((b) => b.id === selectedId) || null;
  const fullRoutePoints = [...boxes.filter((b) => getBoxStatus(b) === 'full')].sort(
    (a, b) => a.lng - b.lng
  );

  return (
    <div className="min-h-screen md:h-screen md:min-h-162.5 flex flex-col md:overflow-hidden">
      <Header
        onOpenModal={() => setModalOpen(true)}
        onScrollToSidebar={() => sidebarRef.current?.scrollIntoView({ behavior: 'smooth' })}
      />

      <main className="flex flex-col md:flex-row flex-1 min-h-0">
        <MapView
          boxes={boxes}
          selectedId={selectedId}
          onSelectBox={setSelectedId}
          routePoints={fullRoutePoints}
          routeActive={routeActive}
        />

        <Sidebar
          sidebarRef={sidebarRef}
          boxes={boxes}
          selectedId={selectedId}
          onSelectBox={setSelectedId}
          onSimulateMail={handleSimulateMail}
          onOptimizeRoute={handleOptimizeRoute}
          routeActive={routeActive}
        />
      </main>

      <DetailDrawer box={selectedBox} onClose={() => setSelectedId(null)} />

      <AddBoxModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAddBox={handleAddBox}
      />

      {/* Всплывающее уведомление */}
      <div
        className={`fixed top-20.5 right-5 z-1200 transition-all duration-300 bg-slate-900 text-white rounded-xl px-4 py-3 shadow-xl flex items-center gap-2 text-sm pointer-events-none ${
          toastMessage ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
        }`}
      >
        <span className="text-emerald-300">✓</span>
        <span>{toastMessage}</span>
      </div>
    </div>
  );
}
