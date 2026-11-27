import { Event } from "../models/Event.js";
import { bus, TOPICS } from "../lib/bus.js";

export async function recordEvent(type, boxId, message) {
  const event = await Event.create({ type, boxId, message });
  bus.emit(TOPICS.EVENT_CREATED, event.toApi());
  return event;
}

export const MESSAGES = Object.freeze({
  full: () => "Capacity reached (100%) — pickup required",
  lowBattery: (b) => `Low battery (${b}%) — service needed`,
  rapidFill: (delta) => `Rapid fill detected (+${delta}% in the last hour)`,
  pickup: () => "Pickup confirmed — mailbox emptied",
  boxCreated: (name) => `Postbox registered: ${name}`,
  offline: (min) => `Sensor offline — no data for ${min}+ min`,
  online: () => "Sensor back online",
});
