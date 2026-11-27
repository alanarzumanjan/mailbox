// Публичные схемы API. Используются и для валидации, и для Swagger.
import { z } from "zod";
import { registry } from "./lib/openapi.js";
import { STATUS } from "./domain/fill.js";

export const BOX_ID = z.string().regex(/^MG-\d{3,}$/, "Expected id like MG-001").openapi({ example: "MG-001" });
export const COURIER_ID = z.string().regex(/^CR-\d{2,}$/, "Expected id like CR-01").openapi({ example: "CR-01" });
export const DEVICE_ID = z.string().regex(/^DEV-\d{3,}$/, "Expected id like DEV-001").openapi({ example: "DEV-001" });
export const OBJECT_ID = z.string().regex(/^[a-f0-9]{24}$/i, "Expected ObjectId");

export const ROLES = ["admin", "dispatcher", "courier"];
export const BOX_STATUSES = Object.values(STATUS);

export const Lat = z.number().min(-90).max(90);
export const Lng = z.number().min(-180).max(180);
export const LatLng = z.object({ lat: Lat, lng: Lng });

export const Pagination = z.object({
  nextCursor: z.string().nullable().openapi({ description: "Pass as ?cursor= to get the next page" }),
});

export const BoxSchema = registry.register(
  "Box",
  z.object({
    id: BOX_ID,
    name: z.string().openapi({ example: "Old Town" }),
    address: z.string().openapi({ example: "Kaļķu iela 1, Riga" }),
    district: z.string().openapi({ example: "centrs" }),
    lat: z.number(),
    lng: z.number(),
    weight: z.number().openapi({ description: "Grams" }),
    max: z.number().openapi({ description: "Capacity in grams" }),
    distance: z.number().nullable().openapi({ description: "IR distance to the top of the mail, mm" }),
    battery: z.number().nullable(),
    fillPercent: z.number(),
    status: z.enum(BOX_STATUSES),
    online: z.boolean().nullable().openapi({ description: "null — no device has reported yet" }),
    fullSince: z.string().datetime().nullable(),
    updatedAt: z.string().datetime().nullable(),
  }),
);

export const CapacitySchema = z
  .object({
    maxWeightG: z.number().int().positive().max(50000),
    emptyDistanceMm: z.number().int().nonnegative().max(5000),
    fullDistanceMm: z.number().int().nonnegative().max(5000),
  })
  .partial()
  .refine(
    (c) => c.emptyDistanceMm == null || c.fullDistanceMm == null || c.emptyDistanceMm > c.fullDistanceMm,
    { message: "emptyDistanceMm must be greater than fullDistanceMm" },
  );

export const ReadingSchema = registry.register(
  "Reading",
  z.object({
    boxId: BOX_ID,
    weight: z.number(),
    distance: z.number().nullable(),
    battery: z.number().nullable(),
    fillPercent: z.number(),
    source: z.enum(["device", "simulation"]),
    createdAt: z.string().datetime(),
  }),
);

export const EventSchema = registry.register(
  "Event",
  z.object({
    id: z.string(),
    type: z.enum(["critical", "warning", "info", "success"]),
    boxId: z.string().openapi({ example: "MG-011", description: "Box id or SYSTEM" }),
    message: z.string(),
    createdAt: z.string().datetime(),
  }),
);

export const CourierSchema = registry.register(
  "Courier",
  z.object({
    id: COURIER_ID,
    name: z.string(),
    district: z.string(),
    zone: z.string(),
    status: z.enum(["en_route", "at_pickup", "break", "offline"]),
    note: z.string(),
    pickups: z.number(),
  }),
);

export const PickupSchema = registry.register(
  "Pickup",
  z.object({
    id: z.string(),
    boxId: BOX_ID,
    courierId: COURIER_ID.nullable(),
    weight: z.number(),
    fillPercent: z.number(),
    responseMin: z.number().nullable().openapi({ description: "Minutes from 'became full' to pickup" }),
    collectedAt: z.string().datetime(),
  }),
);

export const DistrictSchema = registry.register(
  "District",
  z.object({
    id: z.string(),
    label: z.string(),
    center: z.tuple([z.number(), z.number()]).openapi({ description: "[lat, lng] as in Leaflet" }),
    zoom: z.number(),
  }),
);

export const UserSchema = registry.register(
  "User",
  z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: z.enum(ROLES),
    courierId: COURIER_ID.nullable(),
    notifyEmail: z.boolean(),
    active: z.boolean(),
    lastLoginAt: z.string().datetime().nullable(),
  }),
);

export const DeviceSchema = registry.register(
  "Device",
  z.object({
    id: DEVICE_ID,
    boxId: BOX_ID,
    name: z.string(),
    keyPrefix: z.string().openapi({ description: "First characters of the key, to recognise it" }),
    firmware: z.string().nullable(),
    status: z.enum(["active", "revoked"]),
    lastSeenAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  }),
);

export const RouteSchema = registry.register(
  "OptimizedRoute",
  z.object({
    depot: LatLng,
    algorithm: z.enum(["held-karp", "nearest-neighbour+2opt", "none"]),
    totalDistanceKm: z.number(),
    stops: z.array(
      z.object({
        order: z.number(),
        id: BOX_ID,
        name: z.string(),
        lat: z.number(),
        lng: z.number(),
        fillPercent: z.number(),
        legKm: z.number(),
      }),
    ),
  }),
);
