/**
 * Районы Риги для режима курьера: центр и зум для карты,
 * плюс определение района ящика по координатам.
 */
export const DISTRICTS = [
  { id: "all", label: "All Riga", center: [56.9515, 24.112], zoom: 12 },
  {
    id: "centrs",
    label: "Centrs & Old Town",
    center: [56.9505, 24.1115],
    zoom: 14,
  },
  { id: "pardaugava", label: "Pārdaugava", center: [56.942, 24.06], zoom: 13 },
  {
    id: "teika",
    label: "Teika & Purvciems",
    center: [56.962, 24.175],
    zoom: 13,
  },
];

// Грубое разбиление по координатам (подправьте границы под ваши данные).
// Можно задать район явно: { ..., district: "pardaugava" }
export function getBoxDistrict(box) {
  if (box.district) return box.district;
  if (box.lng < 24.093) return "pardaugava"; // левый берег Даугавы
  if (box.lng > 24.14 || box.lat > 56.97) return "teika";
  return "centrs";
}
