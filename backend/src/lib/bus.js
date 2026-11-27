// Internal domain event bus. Services publish facts
// ("box updated", "event created") and subscribers (SSE, notifications)
// react without knowing about each other.
//
// Works within a single process. For multiple API instances it is replaced
// with MongoDB change streams or Redis pub/sub without changing the services.
import { EventEmitter } from "node:events";

export const bus = new EventEmitter();
bus.setMaxListeners(1000); // one listener per open SSE connection

export const TOPICS = Object.freeze({
  BOX_UPDATED: "box.updated",
  EVENT_CREATED: "event.created",
  PICKUP_CREATED: "pickup.created",
});
