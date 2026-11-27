import { Router } from "express";
import { z } from "zod";
import { Box } from "../models/Box.js";
import { Reading } from "../models/Reading.js";
import { Pickup } from "../models/Pickup.js";
import { validate } from "../middleware/validate.js";
import { authenticate, ROLE } from "../middleware/auth.js";
import { HttpError, notFound } from "../middleware/errors.js";
import { registry, envelope, errors, json, jsonBody, bearerAuth } from "../lib/openapi.js";
import { PageQuery, paginate } from "../lib/pagination.js";
import {
  BOX_ID, COURIER_ID, BOX_STATUSES, Lat, Lng, CapacitySchema,
  BoxSchema, ReadingSchema, PickupSchema, Pagination,
} from "../schemas.js";
import { districtFromLocation } from "../domain/geo.js";
import { computeFill, THRESHOLDS } from "../domain/fill.js";
import { collectBox } from "../services/pickups.js";
import { recordEvent, MESSAGES } from "../services/events.js";
import { audit } from "../services/audit.js";
import { bus, TOPICS } from "../lib/bus.js";

const router = Router();
router.use(authenticate);

const security = [{ [bearerAuth.name]: [] }];
const Params = z.object({ id: BOX_ID });

async function findBoxOr404(id) {
  const box = await Box.findOne({ _id: id, active: true });
  if (!box) throw notFound(`Box ${id}`);
  return box;
}

async function nextBoxId() {
  const ids = await Box.find({}, { _id: 1 }).lean();
  const max = ids.reduce((m, { _id }) => Math.max(m, Number(_id.slice(3)) || 0), 0);
  return `MG-${String(max + 1).padStart(3, "0")}`;
}

// ---------- Список и карточка ----------

const ListQuery = z.object({
  district: z.string().optional().openapi({ example: "centrs" }),
  status: z.enum(BOX_STATUSES).optional(),
  lowBattery: z.enum(["true", "false"]).optional(),
  online: z.enum(["true", "false"]).optional(),
});
registry.registerPath({
  method: "get",
  path: "/api/boxes",
  tags: ["Boxes"],
  summary: "Postboxes for the map and tables",
  security,
  request: { query: ListQuery },
  responses: { 200: json(envelope(z.array(BoxSchema))), 401: errors[401] },
});
router.get("/", ROLE.staff, validate({ query: ListQuery }), async (req, res) => {
  const { district, status, lowBattery, online } = req.valid.query;
  const filter = { active: true };
  if (district && district !== "all") filter.district = district;
  if (status) filter["state.status"] = status;
  if (lowBattery === "true") filter["state.battery"] = { $ne: null, $lte: THRESHOLDS.lowBatteryPercent };
  if (online) filter["state.online"] = online === "true";
  const boxes = await Box.find(filter).sort({ _id: 1 });
  res.json({ data: boxes.map((b) => b.toApi()) });
});

registry.registerPath({
  method: "get",
  path: "/api/boxes/{id}",
  tags: ["Boxes"],
  summary: "One postbox",
  security,
  request: { params: Params },
  responses: { 200: json(envelope(BoxSchema)), 404: errors[404] },
});
router.get("/:id", ROLE.staff, validate({ params: Params }), async (req, res) => {
  res.json({ data: (await findBoxOr404(req.valid.params.id)).toApi() });
});

// ---------- Управление (admin) ----------

const CreateBox = z.object({
  name: z.string().trim().min(1).max(120).openapi({ example: "Freedom Monument" }),
  address: z.string().trim().min(1).max(200).openapi({ example: "Brīvības bulvāris, Riga" }),
  lat: Lat.openapi({ example: 56.9514 }),
  lng: Lng.openapi({ example: 24.1132 }),
  district: z.string().optional().openapi({ description: "Derived from coordinates if omitted" }),
  capacity: CapacitySchema.optional(),
});
registry.registerPath({
  method: "post",
  path: "/api/boxes",
  tags: ["Boxes"],
  summary: "Register a postbox (admin)",
  security,
  request: { body: jsonBody(CreateBox) },
  responses: { 201: json(envelope(BoxSchema), "Created"), 400: errors[400], 403: errors[403] },
});
router.post("/", ROLE.admin, validate({ body: CreateBox }), async (req, res) => {
  const { name, address, lat, lng, district, capacity } = req.valid.body;
  const location = { lat, lng };
  const box = await Box.create({
    _id: await nextBoxId(),
    name,
    address,
    location,
    district: district ?? districtFromLocation(location),
    capacity,
  });
  await Promise.all([
    recordEvent("info", box._id, MESSAGES.boxCreated(name)),
    audit(req, "box.create", "box", box._id, req.valid.body),
  ]);
  bus.emit(TOPICS.BOX_UPDATED, box.toApi());
  res.status(201).location(`/api/boxes/${box._id}`).json({ data: box.toApi() });
});

const UpdateBox = z
  .object({
    name: z.string().trim().min(1).max(120),
    address: z.string().trim().min(1).max(200),
    lat: Lat,
    lng: Lng,
    district: z.string(),
    capacity: CapacitySchema,
  })
  .partial()
  .refine((b) => Object.keys(b).length > 0, { message: "Empty update" })
  .refine((b) => (b.lat == null) === (b.lng == null), { message: "lat and lng go together" });
registry.registerPath({
  method: "patch",
  path: "/api/boxes/{id}",
  tags: ["Boxes"],
  summary: "Update details or sensor calibration (admin)",
  security,
  request: { params: Params, body: jsonBody(UpdateBox) },
  responses: { 200: json(envelope(BoxSchema)), 400: errors[400], 404: errors[404] },
});
router.patch("/:id", ROLE.admin, validate({ params: Params, body: UpdateBox }), async (req, res) => {
  const box = await findBoxOr404(req.valid.params.id);
  const { lat, lng, capacity, ...rest } = req.valid.body;

  Object.assign(box, rest);
  if (lat != null) box.location = { lat, lng };
  if (capacity) {
    Object.assign(box.capacity, capacity);
    if (box.capacity.emptyDistanceMm <= box.capacity.fullDistanceMm) {
      throw new HttpError(400, "validation_error", "emptyDistanceMm must be greater than fullDistanceMm");
    }
    // Новая калибровка меняет процент заполнения — пересчитываем снимок.
    const { fillPercent, status } = computeFill(
      { weightG: box.state.weightG, distanceMm: box.state.distanceMm },
      box.capacity,
    );
    box.state.fillPercent = fillPercent;
    box.state.status = status;
  }
  await box.save();
  await audit(req, "box.update", "box", box._id, req.valid.body);
  bus.emit(TOPICS.BOX_UPDATED, box.toApi());
  res.json({ data: box.toApi() });
});

registry.registerPath({
  method: "delete",
  path: "/api/boxes/{id}",
  tags: ["Boxes"],
  summary: "Decommission a postbox; history is kept (admin)",
  security,
  request: { params: Params },
  responses: { 204: { description: "Decommissioned" }, 404: errors[404] },
});
router.delete("/:id", ROLE.admin, validate({ params: Params }), async (req, res) => {
  const box = await findBoxOr404(req.valid.params.id);
  box.active = false;
  await box.save();
  await audit(req, "box.decommission", "box", box._id);
  res.status(204).end();
});

// ---------- История ----------

registry.registerPath({
  method: "get",
  path: "/api/boxes/{id}/readings",
  tags: ["Boxes"],
  summary: "Sensor reading history, newest first (paginated)",
  security,
  request: { params: Params, query: PageQuery },
  responses: { 200: json(envelope(z.array(ReadingSchema)).merge(Pagination)), 404: errors[404] },
});
router.get("/:id/readings", ROLE.dispatch, validate({ params: Params, query: PageQuery }), async (req, res) => {
  await findBoxOr404(req.valid.params.id);
  const { items, nextCursor } = await paginate(Reading, { boxId: req.valid.params.id }, req.valid.query);
  res.json({ data: items.map((r) => r.toApi()), nextCursor });
});

registry.registerPath({
  method: "get",
  path: "/api/boxes/{id}/pickups",
  tags: ["Boxes"],
  summary: "Pickup history, newest first (paginated)",
  security,
  request: { params: Params, query: PageQuery },
  responses: { 200: json(envelope(z.array(PickupSchema)).merge(Pagination)), 404: errors[404] },
});
router.get("/:id/pickups", ROLE.dispatch, validate({ params: Params, query: PageQuery }), async (req, res) => {
  await findBoxOr404(req.valid.params.id);
  const { items, nextCursor } = await paginate(
    Pickup, { boxId: req.valid.params.id }, req.valid.query, "collectedAt",
  );
  res.json({ data: items.map((p) => p.toApi()), nextCursor });
});

// ---------- Выемка ----------

const PickupBody = z.object({
  courierId: COURIER_ID.optional().openapi({ description: "Dispatchers only; couriers act as themselves" }),
});
registry.registerPath({
  method: "post",
  path: "/api/boxes/{id}/pickups",
  tags: ["Boxes"],
  summary: "Confirm a pickup: box is emptied, event logged, courier credited",
  security,
  request: { params: Params, body: jsonBody(PickupBody) },
  responses: {
    201: json(envelope(z.object({ box: BoxSchema, pickup: PickupSchema })), "Collected"),
    403: errors[403],
    404: errors[404],
  },
});
router.post("/:id/pickups", ROLE.staff, validate({ params: Params, body: PickupBody }), async (req, res) => {
  let courierId = req.valid.body.courierId ?? null;
  if (req.user.role === "courier") {
    // Курьер не может записать выемку на другого курьера
    if (courierId && courierId !== req.user.courierId) {
      throw new HttpError(403, "forbidden", "Couriers can only record their own pickups");
    }
    courierId = req.user.courierId;
  }
  const { box, pickup } = await collectBox(req.valid.params.id, courierId);
  res.status(201).json({ data: { box: box.toApi(), pickup: pickup.toApi() } });
});

export default router;
