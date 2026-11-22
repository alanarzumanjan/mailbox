/**
 * Стартовые данные по почтовым ящикам в Риге и вспомогательные функции
 * для расчета процента заполненности и статуса (normal, warning, full).
 */

export const INITIAL_BOXES = [
  {
    id: "MG-001",
    name: "Old Town",
    address: "Kaļķu iela 1, Riga",
    lat: 56.9496,
    lng: 24.1052,
    weight: 1850,
    max: 2000,
    battery: 94,
    updated: "Just now",
  },
  {
    id: "MG-002",
    name: "Central Station",
    address: "Stacijas laukums 2, Riga",
    lat: 56.9468,
    lng: 24.1194,
    weight: 620,
    max: 2000,
    battery: 87,
    updated: "2 min ago",
  },
  {
    id: "MG-003",
    name: "Art Nouveau Quarter",
    address: "Alberta iela 12, Riga",
    lat: 56.9604,
    lng: 24.102,
    weight: 410,
    max: 2000,
    battery: 76,
    updated: "5 min ago",
  },
  {
    id: "MG-004",
    name: "Central Market",
    address: "Nēģu iela 7, Riga",
    lat: 56.9437,
    lng: 24.1141,
    weight: 260,
    max: 2000,
    battery: 98,
    updated: "8 min ago",
  },
  {
    id: "MG-005",
    name: "Esplanāde Park",
    address: "Elizabetes iela 55, Riga",
    lat: 56.9558,
    lng: 24.113,
    weight: 1080,
    max: 2000,
    battery: 62,
    updated: "12 min ago",
  },
];

export function getBoxStatus(box) {
  if (box.weight >= box.max) return "full";
  if (box.weight >= box.max * 0.75) return "warning";
  return "normal";
}

export function getBoxPercent(box) {
  return Math.min(100, Math.round((box.weight / box.max) * 100));
}
