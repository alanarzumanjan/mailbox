// Background check: which sensors stopped reporting.
// A sensor that never sent data (lastSeenAt = null) is not
// considered lost; it simply has not been installed yet.
import { Device } from "../models/Device.js";
import { Box } from "../models/Box.js";
import { bus, TOPICS } from "../lib/bus.js";
import { logger } from "../lib/logger.js";
import { recordEvent, MESSAGES } from "./events.js";

export async function markOfflineDevices(offlineMinutes, now = Date.now()) {
  const cutoff = new Date(now - offlineMinutes * 60_000);
  const stale = await Device.find({ status: "active", lastSeenAt: { $ne: null, $lt: cutoff } })
    .select("boxId")
    .lean();
  if (stale.length === 0) return [];

  const marked = [];
  for (const { boxId } of stale) {
    // The online: true filter makes this idempotent: a second run
    // or a second instance will not create a duplicate event.
    const box = await Box.findOneAndUpdate(
      { _id: boxId, active: true, "state.online": true },
      { $set: { "state.online": false } },
      { new: true },
    );
    if (!box) continue;
    await recordEvent("warning", boxId, MESSAGES.offline(offlineMinutes));
    bus.emit(TOPICS.BOX_UPDATED, box.toApi());
    marked.push(boxId);
  }
  return marked;
}

export function startMonitor({ offlineMinutes, intervalSec }) {
  const tick = () =>
    markOfflineDevices(offlineMinutes)
      .then((ids) => ids.length && logger.warn({ boxIds: ids }, "sensors went offline"))
      .catch((err) => logger.error({ err }, "offline monitor failed"));
  const timer = setInterval(tick, intervalSec * 1000);
  timer.unref();
  return () => clearInterval(timer);
}
