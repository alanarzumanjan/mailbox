/**
 * Демо-данные панели диспетчера: лента событий IoT-датчиков,
 * курьеры на смене и показатели смены. Бэкенд не нужен.
 */

// Порог низкого заряда батареи датчика (%)
export const LOW_BATTERY_THRESHOLD = 20;

// Показатели смены
export const SHIFT_STATS = {
  shiftLabel: "Day shift · 08:00–16:00 · Riga network",
  avgResponseMin: 18, // среднее время реакции на заполнение ящика
  targetResponseMin: 20,
};

// Курьеры. status: en_route | at_pickup | break | offline
export const COURIERS = [
  {
    id: "CR-01",
    name: "Jānis Ozols",
    district: "centrs",
    zone: "Centrs & Old Town",
    status: "en_route",
    pickups: 7,
    note: "Heading to MG-001",
  },
  {
    id: "CR-02",
    name: "Anna Kalniņa",
    district: "pardaugava",
    zone: "Pārdaugava",
    status: "at_pickup",
    pickups: 9,
    note: "At MG-006 · collecting",
  },
  {
    id: "CR-03",
    name: "Mārtiņš Liepa",
    district: "teika",
    zone: "Teika & Purvciems",
    status: "en_route",
    pickups: 5,
    note: "Heading to MG-011",
  },
  {
    id: "CR-04",
    name: "Elīna Bērziņa",
    district: "all",
    zone: "Floating · all zones",
    status: "break",
    pickups: 2,
    note: "Back at 16:15",
  },
];

// Стартовая лента событий (новые сверху)
export const INITIAL_EVENTS = [
  {
    id: "EV-010",
    type: "critical",
    boxId: "MG-011",
    message: "Capacity reached (100%) — pickup required",
    time: "15:48",
  },
  {
    id: "EV-009",
    type: "warning",
    boxId: "MG-003",
    message: "Low battery (15%) — service needed",
    time: "15:36",
  },
  {
    id: "EV-008",
    type: "warning",
    boxId: "MG-005",
    message: "Rapid fill detected (+40% in the last hour)",
    time: "15:21",
  },
  {
    id: "EV-007",
    type: "info",
    boxId: "MG-001",
    message: "Lid opened by courier",
    time: "14:32",
  },
  {
    id: "EV-006",
    type: "success",
    boxId: "MG-008",
    message: "Pickup confirmed — mailbox emptied",
    time: "14:10",
  },
  {
    id: "EV-005",
    type: "warning",
    boxId: "MG-009",
    message: "Low battery (18%) — service needed",
    time: "13:52",
  },
  {
    id: "EV-004",
    type: "critical",
    boxId: "MG-006",
    message: "Capacity reached (100%) — pickup required",
    time: "13:40",
  },
  {
    id: "EV-003",
    type: "info",
    boxId: "MG-012",
    message: "Sensor calibration completed",
    time: "12:58",
  },
  {
    id: "EV-002",
    type: "success",
    boxId: "MG-010",
    message: "Pickup confirmed — mailbox emptied",
    time: "12:15",
  },
  {
    id: "EV-001",
    type: "info",
    boxId: "SYSTEM",
    message: "Shift started · 4 couriers signed in",
    time: "08:00",
  },
];
