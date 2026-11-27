// География: расстояние между точками и район Риги по координатам.

const EARTH_RADIUS_KM = 6371;
const toRad = (d) => (d * Math.PI) / 180;

export function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// Точка старта курьера по умолчанию — центр "All Riga" из data/districts.js
export const DEFAULT_DEPOT = Object.freeze({ lat: 56.9515, lng: 24.112 });

// Та же грубая разбивка, что и во фронте (data/districts.js → getBoxDistrict),
// чтобы ящик, созданный через API, попадал в тот же район, что и на карте.
export function districtFromLocation({ lat, lng }) {
  if (lng < 24.093) return "pardaugava"; // левый берег Даугавы
  if (lng > 24.14 || lat > 56.97) return "teika";
  return "centrs";
}
