// Box fill level from two sensors.
//
// Weight (load cell + HX711) notices even a single light postcard but not
// volume. The IR distance sensor on top triggers when letters reach the top,
// even if they are light. We take the max of the two percentages: the box counts
// as full if it is full by either measure.

// Thresholds match the frontend (data/initialBoxes.js → getBoxStatus).
export const THRESHOLDS = Object.freeze({
  warningPercent: 75,
  fullPercent: 100,
  lowBatteryPercent: 20, // data/dispatchData.js → LOW_BATTERY_THRESHOLD
  rapidFillPercentPerHour: 40,
});

export const STATUS = Object.freeze({
  NORMAL: "normal",
  WARNING: "warning",
  FULL: "full",
});

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function weightPercent(weightG, maxWeightG) {
  if (!maxWeightG || maxWeightG <= 0) return 0;
  return clamp((weightG / maxWeightG) * 100, 0, 100);
}

// emptyMm is the distance to the bottom of an empty box, fullMm to the "full line".
// The smaller the distance, the taller the stack of letters.
export function volumePercent(distanceMm, emptyMm, fullMm) {
  if (distanceMm == null || emptyMm == null || fullMm == null) return 0;
  if (emptyMm <= fullMm) return 0;
  return clamp(((emptyMm - distanceMm) / (emptyMm - fullMm)) * 100, 0, 100);
}

export function computeFill({ weightG, distanceMm }, capacity) {
  const byWeight = weightPercent(weightG, capacity.maxWeightG);
  const byVolume = volumePercent(distanceMm, capacity.emptyDistanceMm, capacity.fullDistanceMm);
  const fillPercent = Math.round(Math.max(byWeight, byVolume));
  return {
    fillPercent,
    status: statusFromPercent(fillPercent),
    trigger: byVolume > byWeight ? "volume" : "weight",
  };
}

export function statusFromPercent(p) {
  if (p >= THRESHOLDS.fullPercent) return STATUS.FULL;
  if (p >= THRESHOLDS.warningPercent) return STATUS.WARNING;
  return STATUS.NORMAL;
}

export const isLowBattery = (battery) =>
  battery != null && battery <= THRESHOLDS.lowBatteryPercent;
