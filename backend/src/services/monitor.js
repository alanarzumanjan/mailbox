// Фоновая проверка: какие датчики перестали выходить на связь.
// Датчик, который ни разу не присылал данные (lastSeenAt = null), не
// считается пропавшим — он просто ещё не установлен.
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
    // Условие online: true в фильтре делает операцию идемпотентной:
    // повторный прогон или второй инстанс не создадут дубль события.
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
