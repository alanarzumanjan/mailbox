// Выемка: курьер нажимает "Collect" (components/CourierPickupSheet.js).
import { Box } from "../models/Box.js";
import { Courier } from "../models/Courier.js";
import { Pickup } from "../models/Pickup.js";
import { STATUS } from "../domain/fill.js";
import { notFound } from "../middleware/errors.js";
import { bus, TOPICS } from "../lib/bus.js";
import { recordEvent, MESSAGES } from "./events.js";

export async function collectBox(boxId, courierId = null) {
  const box = await Box.findById(boxId);
  if (!box || !box.active) throw notFound(`Box ${boxId}`);

  if (courierId && !(await Courier.exists({ _id: courierId }))) {
    throw notFound(`Courier ${courierId}`);
  }

  const now = new Date();
  const responseMin = box.state.fullSince
    ? Math.round((now - box.state.fullSince) / 60000)
    : null;

  const pickup = await Pickup.create({
    boxId,
    courierId,
    weightG: box.state.weightG,
    fillPercent: box.state.fillPercent,
    responseMin,
    collectedAt: now,
  });

  // Сбрасываем снимок сразу, не дожидаясь следующего показания датчика,
  // чтобы ящик моментально пропал из маршрута курьера.
  box.state.weightG = 0;
  box.state.distanceMm = box.capacity.emptyDistanceMm;
  box.state.fillPercent = 0;
  box.state.status = STATUS.NORMAL;
  box.state.fullSince = null;

  await Promise.all([
    box.save(),
    courierId ? Courier.updateOne({ _id: courierId }, { $inc: { pickups: 1 } }) : null,
    recordEvent("success", boxId, MESSAGES.pickup()),
  ]);

  bus.emit(TOPICS.BOX_UPDATED, box.toApi());
  bus.emit(TOPICS.PICKUP_CREATED, pickup.toApi());
  return { box, pickup };
}
