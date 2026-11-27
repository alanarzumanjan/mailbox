// Наполнение базы демо-данными фронта (src/seed/data.json выгружен из
// data/initialBoxes.js, data/districts.js, data/dispatchData.js) плюс
// демо-пользователи и датчик для MG-001.
//
//   npm run seed                                   — локально
//   docker compose exec api node src/seed/seed.js  — в Docker
//
// Пересоздаёт коллекции, поэтому можно гонять сколько угодно.
// В production не запускать: сотрёт реальные данные.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Box } from "../models/Box.js";
import { Reading } from "../models/Reading.js";
import { Event } from "../models/Event.js";
import { Courier } from "../models/Courier.js";
import { Pickup } from "../models/Pickup.js";
import { District } from "../models/District.js";
import { User } from "../models/User.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { Device } from "../models/Device.js";
import { AuditLog } from "../models/AuditLog.js";
import { computeFill, STATUS } from "../domain/fill.js";
import { hashPassword } from "../services/auth.js";
import { provisionDevice } from "../services/devices.js";
import { logger } from "../lib/logger.js";

const data = JSON.parse(readFileSync(new URL("./data.json", import.meta.url), "utf8"));

// Демо-доступы для разработки и презентации. В production пользователей
// создаёт админ через POST /api/users.
export const DEMO_USERS = Object.freeze([
  { email: "admin@emptyless.lv", name: "Admin", role: "admin", password: "admin-demo-2026", notifyEmail: true },
  { email: "dispatcher@emptyless.lv", name: "Dispatcher", role: "dispatcher", password: "dispatch-demo-2026", notifyEmail: true },
  { email: "courier@emptyless.lv", name: "Jānis Ozols", role: "courier", password: "courier-demo-2026", courierId: "CR-01" },
]);

// "15:48" → последний прошедший момент с этим временем (сегодня или вчера),
// чтобы демо-события не оказались в будущем и не висели выше настоящих.
function lastOccurrenceOf(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d > new Date()) d.setDate(d.getDate() - 1);
  return d;
}

export async function seedDatabase({ quiet = false } = {}) {
  const models = [Box, Reading, Event, Courier, Pickup, District, User, RefreshToken, Device, AuditLog];
  await Promise.all(models.map((M) => M.deleteMany({})));

  const now = new Date();
  const boxes = data.boxes.map((b) => {
    const capacity = { maxWeightG: b.max, emptyDistanceMm: 300, fullDistanceMm: 40 };
    const { fillPercent, status } = computeFill({ weightG: b.weight, distanceMm: null }, capacity);
    return {
      _id: b.id,
      name: b.name,
      address: b.address,
      district: b.district,
      location: { lat: b.lat, lng: b.lng },
      capacity,
      state: {
        weightG: b.weight,
        distanceMm: null,
        battery: b.battery,
        fillPercent,
        status,
        fullSince: status === STATUS.FULL ? now : null,
        lastReadingAt: now,
      },
    };
  });

  await Promise.all([
    Box.insertMany(boxes),
    District.insertMany(
      data.districts.map((d) => ({
        _id: d.id,
        label: d.label,
        center: { lat: d.center[0], lng: d.center[1] },
        zoom: d.zoom,
      })),
    ),
    Courier.insertMany(data.couriers.map(({ id, ...c }) => ({ _id: id, ...c }))),
    Event.insertMany(
      data.events.map((e) => ({
        type: e.type, boxId: e.boxId, message: e.message, createdAt: lastOccurrenceOf(e.time),
      })),
    ),
  ]);

  await User.insertMany(
    await Promise.all(
      DEMO_USERS.map(async ({ password, ...u }) => ({ ...u, passwordHash: await hashPassword(password) })),
    ),
  );

  // Индексы (включая уникальные и TTL) создаём явно, не полагаясь на autoIndex.
  await Promise.all(models.map((M) => M.syncIndexes()));

  // Датчик для реального прототипа: его ключ прошивается в Arduino-мост.
  const { device, apiKey } = await provisionDevice({ boxId: "MG-001", name: "Prototype (Arduino)" });

  if (!quiet) {
    logger.info(
      { boxes: boxes.length, districts: data.districts.length, couriers: data.couriers.length,
        events: data.events.length, users: DEMO_USERS.map((u) => u.email) },
      "database seeded",
    );
    // Ключ показывается один раз — как при настоящей выдаче датчика.
    console.log(`\nDemo device ${device.id} for ${device.boxId}. X-Device-Key:\n  ${apiKey}\n`);
  }
  return { deviceKey: apiKey, deviceId: device.id };
}

// Запуск как скрипта: node src/seed/seed.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { config } = await import("../config.js");
  if (config.NODE_ENV === "production") {
    console.error("Refusing to seed in production: it wipes all data.");
    process.exit(1);
  }
  const { connectDb, disconnectDb } = await import("../db.js");
  await connectDb(config.MONGODB_URI);
  await seedDatabase();
  await disconnectDb();
}
