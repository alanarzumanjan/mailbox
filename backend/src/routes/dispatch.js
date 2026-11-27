// Панель диспетчера: лента событий, курьеры, районы, KPI, аудит.
import { Router } from "express";
import { z } from "zod";
import { Event, EVENT_TYPES } from "../models/Event.js";
import { Courier, COURIER_STATUSES } from "../models/Courier.js";
import { District } from "../models/District.js";
import { AuditLog } from "../models/AuditLog.js";
import { validate } from "../middleware/validate.js";
import { authenticate, ROLE } from "../middleware/auth.js";
import { HttpError, notFound } from "../middleware/errors.js";
import { registry, envelope, errors, json, jsonBody, bearerAuth } from "../lib/openapi.js";
import { PageQuery, paginate } from "../lib/pagination.js";
import { COURIER_ID, EventSchema, CourierSchema, DistrictSchema, Pagination } from "../schemas.js";
import { getOverview } from "../services/stats.js";
import { audit } from "../services/audit.js";

const security = [{ [bearerAuth.name]: [] }];

// ---------- События ----------

export const eventsRouter = Router();
eventsRouter.use(authenticate, ROLE.staff);

const EventsQuery = PageQuery.extend({
  type: z.enum(EVENT_TYPES).optional(),
  boxId: z.string().optional(),
  since: z.coerce.date().optional().openapi({ description: "Only events after this time (polling)" }),
});
registry.registerPath({
  method: "get",
  path: "/api/events",
  tags: ["Dispatch"],
  summary: "Alert feed, newest first (paginated). Prefer /api/stream for live updates.",
  security,
  request: { query: EventsQuery },
  responses: { 200: json(envelope(z.array(EventSchema)).merge(Pagination)) },
});
eventsRouter.get("/", validate({ query: EventsQuery }), async (req, res) => {
  const { type, boxId, since, ...page } = req.valid.query;
  const filter = {};
  if (type) filter.type = type;
  if (boxId) filter.boxId = boxId;
  if (since) filter.createdAt = { $gt: since };
  const { items, nextCursor } = await paginate(Event, filter, page);
  res.json({ data: items.map((e) => e.toApi()), nextCursor });
});

// ---------- Курьеры ----------

export const couriersRouter = Router();
couriersRouter.use(authenticate);

registry.registerPath({
  method: "get",
  path: "/api/couriers",
  tags: ["Dispatch"],
  summary: "Couriers on shift",
  security,
  responses: { 200: json(envelope(z.array(CourierSchema))) },
});
couriersRouter.get("/", ROLE.staff, async (req, res) => {
  const couriers = await Courier.find().sort({ _id: 1 });
  res.json({ data: couriers.map((c) => c.toApi()) });
});

const CourierParams = z.object({ id: COURIER_ID });
const CourierUpdate = z
  .object({
    status: z.enum(COURIER_STATUSES),
    note: z.string().max(200),
    district: z.string(),
    zone: z.string(),
  })
  .partial()
  .refine((b) => Object.keys(b).length > 0, { message: "Empty update" });
registry.registerPath({
  method: "patch",
  path: "/api/couriers/{id}",
  tags: ["Dispatch"],
  summary: "Update courier status/assignment. Couriers may update only their own status and note.",
  security,
  request: { params: CourierParams, body: jsonBody(CourierUpdate) },
  responses: { 200: json(envelope(CourierSchema)), 403: errors[403], 404: errors[404] },
});
couriersRouter.patch("/:id", ROLE.staff, validate({ params: CourierParams, body: CourierUpdate }), async (req, res) => {
  const { id } = req.valid.params;
  if (req.user.role === "courier") {
    const ownFieldsOnly = Object.keys(req.valid.body).every((k) => k === "status" || k === "note");
    if (id !== req.user.courierId || !ownFieldsOnly) {
      throw new HttpError(403, "forbidden", "Couriers can only update their own status and note");
    }
  }
  const courier = await Courier.findByIdAndUpdate(id, req.valid.body, { new: true, runValidators: true });
  if (!courier) throw notFound(`Courier ${id}`);
  if (req.user.role !== "courier") await audit(req, "courier.update", "courier", id, req.valid.body);
  res.json({ data: courier.toApi() });
});

// ---------- Районы ----------

export const districtsRouter = Router();
districtsRouter.use(authenticate, ROLE.staff);

registry.registerPath({
  method: "get",
  path: "/api/districts",
  tags: ["Dispatch"],
  summary: "Districts for filters and map centring; 'all' first",
  security,
  responses: { 200: json(envelope(z.array(DistrictSchema))) },
});
districtsRouter.get("/", async (req, res) => {
  const districts = await District.find();
  districts.sort((a, b) => (a._id === "all" ? -1 : b._id === "all" ? 1 : 0));
  res.json({ data: districts.map((d) => d.toApi()) });
});

// ---------- KPI ----------

export const statsRouter = Router();
statsRouter.use(authenticate, ROLE.dispatch);

const Overview = z.object({
  boxes: z.object({
    total: z.number(), full: z.number(), warning: z.number(), normal: z.number(),
    lowBattery: z.number(), offline: z.number(),
  }),
  couriers: z.object({ active: z.number(), total: z.number() }),
  pickupsToday: z.number(),
  avgResponseMin: z.number().nullable(),
  targetResponseMin: z.number(),
  responseOk: z.boolean().nullable(),
});
registry.registerPath({
  method: "get",
  path: "/api/stats/overview",
  tags: ["Dispatch"],
  summary: "Dispatcher header KPIs",
  security,
  responses: { 200: json(envelope(Overview)), 403: errors[403] },
});
statsRouter.get("/overview", async (req, res) => {
  res.json({ data: await getOverview() });
});

// ---------- Аудит (admin) ----------

export const auditRouter = Router();
auditRouter.use(authenticate, ROLE.admin);

const AuditQuery = PageQuery.extend({
  targetType: z.string().optional(),
  targetId: z.string().optional(),
});
registry.registerPath({
  method: "get",
  path: "/api/audit",
  tags: ["Users"],
  summary: "Admin action log (admin, paginated)",
  security,
  request: { query: AuditQuery },
  responses: { 200: json(envelope(z.array(z.any())).merge(Pagination)), 403: errors[403] },
});
auditRouter.get("/", validate({ query: AuditQuery }), async (req, res) => {
  const { targetType, targetId, ...page } = req.valid.query;
  const filter = {};
  if (targetType) filter.targetType = targetType;
  if (targetId) filter.targetId = targetId;
  const { items, nextCursor } = await paginate(AuditLog, filter, page);
  res.json({ data: items.map((a) => a.toApi()), nextCursor });
});
