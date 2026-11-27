// KPIs for the dispatcher header (components/DispatcherDashboard.js).
import { Box } from "../models/Box.js";
import { Courier, ACTIVE_COURIER_STATUSES } from "../models/Courier.js";
import { Pickup } from "../models/Pickup.js";
import { STATUS, THRESHOLDS } from "../domain/fill.js";

export const TARGET_RESPONSE_MIN = 20; // data/dispatchData.js → SHIFT_STATS.targetResponseMin

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getOverview() {
  const active = { active: true };
  const since = startOfToday();

  const [total, full, warning, lowBattery, offline, couriersTotal, couriersActive, pickupsToday] =
    await Promise.all([
      Box.countDocuments(active),
      Box.countDocuments({ ...active, "state.status": STATUS.FULL }),
      Box.countDocuments({ ...active, "state.status": STATUS.WARNING }),
      Box.countDocuments({ ...active, "state.battery": { $ne: null, $lte: THRESHOLDS.lowBatteryPercent } }),
      Box.countDocuments({ ...active, "state.online": false }),
      Courier.countDocuments(),
      Courier.countDocuments({ status: { $in: ACTIVE_COURIER_STATUSES } }),
      Pickup.find({ collectedAt: { $gte: since } }).select("responseMin").lean(),
    ]);

  // Average computed in the app: few pickups per day, and a plain find
  // behaves the same on MongoDB and on the FerretDB used in tests.
  const responses = pickupsToday.map((p) => p.responseMin).filter((m) => m != null);
  const avgResponseMin = responses.length
    ? Math.round(responses.reduce((a, b) => a + b, 0) / responses.length)
    : null;

  return {
    boxes: { total, full, warning, normal: total - full - warning, lowBattery, offline },
    couriers: { active: couriersActive, total: couriersTotal },
    pickupsToday: pickupsToday.length,
    avgResponseMin,
    targetResponseMin: TARGET_RESPONSE_MIN,
    responseOk: avgResponseMin == null ? null : avgResponseMin <= TARGET_RESPONSE_MIN,
  };
}
