// Geography: distance between points and Riga district by coordinates.

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

// Default courier start point: the "All Riga" centre from data/districts.js
export const DEFAULT_DEPOT = Object.freeze({ lat: 56.9515, lng: 24.112 });

// Same rough split as the frontend (data/districts.js → getBoxDistrict),
// so a box created via the API lands in the same district as on the map.
export function districtFromLocation({ lat, lng }) {
  if (lng < 24.093) return "pardaugava"; // left bank of the Daugava
  if (lng > 24.14 || lat > 56.97) return "teika";
  return "centrs";
}
