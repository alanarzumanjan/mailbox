// Sensor reading ingestion: update the box snapshot, store history
// and raise events on state TRANSITIONS (not on every reading), so weight
// jitter around a threshold does not flood the dispatcher feed with duplicate alerts.
import { Box } from "../models/Box.js";
import { Reading } from "../models/Reading.js";
import { computeFill, isLowBattery, STATUS, THRESHOLDS } from "../domain/fill.js";
import { notFound } from "../middleware/errors.js";
import { bus, TOPICS } from "../lib/bus.js";
import { recordEvent, MESSAGES } from "./events.js";

const HOUR_MS = 60 * 60 * 1000;

async function detectRapidFill(boxId, prevFill, newFill, now) {
  const hourAgo = await Reading.findOne({
    boxId,
    createdAt: { $gte: new Date(now - HOUR_MS) },
  }).sort({ createdAt: 1 });
  if (!hourAgo) return null;

  const delta = newFill - hourAgo.fillPercent;
  const prevDelta = prevFill - hourAgo.fillPercent;
  const limit = THRESHOLDS.rapidFillPercentPerHour;
  // Only at the moment the threshold is crossed, not on every following reading.
  return delta >= limit && prevDelta < limit ? Math.round(delta) : null;
}

/**
 * @param {string} boxId
 * @param {{ weightG: number, distanceMm?: number|null, battery?: number|null }} reading
 * @param {{ source?: "device"|"simulation", device?: import("mongoose").Document }} [opts]
 */
export async function ingestReading(boxId, reading, { source = "device", device = null } = {}) {
  const box = await Box.findById(boxId);
  if (!box || !box.active) throw notFound(`Box ${boxId}`);

  const now = Date.now();
  const prev = {
    status: box.state.status,
    fillPercent: box.state.fillPercent,
    battery: box.state.battery,
    online: box.state.online,
  };

  const distanceMm = reading.distanceMm ?? null;
  const battery = reading.battery ?? box.state.battery; // battery may be missing
  const { fillPercent, status, trigger } = computeFill(
    { weightG: reading.weightG, distanceMm },
    box.capacity,
  );

  const rapidDelta = await detectRapidFill(boxId, prev.fillPercent, fillPercent, now);

  box.state.weightG = reading.weightG;
  box.state.distanceMm = distanceMm;
  box.state.battery = battery;
  box.state.fillPercent = fillPercent;
  box.state.status = status;
  box.state.lastReadingAt = new Date(now);
  if (status === STATUS.FULL && prev.status !== STATUS.FULL) box.state.fullSince = new Date(now);
  if (status !== STATUS.FULL) box.state.fullSince = null;
  if (source === "device") box.state.online = true;

  const writes = [
    box.save(),
    Reading.create({
      boxId,
      weightG: reading.weightG,
      distanceMm,
      battery,
      fillPercent,
      source,
      createdAt: new Date(now),
    }),
  ];
  if (device) {
    device.lastSeenAt = new Date(now);
    if (reading.firmware) device.firmware = reading.firmware;
    writes.push(device.save());
  }
  await Promise.all(writes);

  const events = [];
  if (status === STATUS.FULL && prev.status !== STATUS.FULL) {
    events.push(recordEvent("critical", boxId, MESSAGES.full()));
  }
  if (isLowBattery(battery) && !isLowBattery(prev.battery)) {
    events.push(recordEvent("warning", boxId, MESSAGES.lowBattery(battery)));
  }
  if (rapidDelta !== null) {
    events.push(recordEvent("warning", boxId, MESSAGES.rapidFill(rapidDelta)));
  }
  if (source === "device" && prev.online === false) {
    events.push(recordEvent("info", boxId, MESSAGES.online()));
  }
  const created = await Promise.all(events);

  bus.emit(TOPICS.BOX_UPDATED, box.toApi());
  return { box, trigger, events: created };
}
