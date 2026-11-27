// Sensors: reading ingestion (by device key) and management (admin).
import { Router } from "express";
import { z } from "zod";
import { deviceAuth } from "../middleware/deviceAuth.js";
import { authenticate, ROLE } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { HttpError } from "../middleware/errors.js";
import { registry, envelope, errors, json, jsonBody, bearerAuth, deviceKeyAuth } from "../lib/openapi.js";
import { BOX_ID, DEVICE_ID, DeviceSchema, BOX_STATUSES } from "../schemas.js";
import { Device } from "../models/Device.js";
import { ingestReading } from "../services/telemetry.js";
import { provisionDevice, rotateDeviceKey, revokeDevice } from "../services/devices.js";
import { audit } from "../services/audit.js";

export function createDevicesRouter({ limiter }) {
  const router = Router();
  const security = [{ [bearerAuth.name]: [] }];

  // ---------- Telemetry ----------

  // The contract matches what the Arduino already prints to Serial: weight and distance.
  const ReadingBody = z.object({
    weight: z.number().min(0).max(100000).openapi({ description: "Grams", example: 1850 }),
    distance: z.number().min(0).max(5000).nullable().optional()
      .openapi({ description: "IR distance to the top of the mail, mm", example: 120 }),
    battery: z.number().min(0).max(100).nullable().optional().openapi({ example: 86 }),
    firmware: z.string().max(40).optional().openapi({ example: "1.2.0" }),
    boxId: BOX_ID.optional().openapi({ description: "Optional; must match the device's box" }),
  });
  const ReadingResult = z.object({
    boxId: BOX_ID,
    status: z.enum(BOX_STATUSES).openapi({ description: "Use to switch the LED" }),
    fillPercent: z.number(),
    trigger: z.enum(["weight", "volume"]),
    events: z.number(),
  });

  registry.registerPath({
    method: "post",
    path: "/api/devices/readings",
    tags: ["Telemetry"],
    summary: "Sensor reading from a device",
    security: [{ [deviceKeyAuth.name]: [] }],
    request: { body: jsonBody(ReadingBody) },
    responses: {
      201: json(envelope(ReadingResult), "Stored"),
      400: errors[400],
      401: errors[401],
      403: errors[403],
      429: errors[429],
    },
  });
  router.post("/readings", limiter, deviceAuth, validate({ body: ReadingBody }), async (req, res) => {
    const { boxId, weight, distance, battery, firmware } = req.valid.body;
    if (boxId && boxId !== req.device.boxId) {
      throw new HttpError(403, "forbidden", "This device is not installed in that box");
    }
    const { box, trigger, events } = await ingestReading(
      req.device.boxId,
      { weightG: weight, distanceMm: distance, battery, firmware },
      { source: "device", device: req.device },
    );
    // Short response: the device only needs the status to switch its LED.
    res.status(201).json({
      data: {
        boxId: box._id,
        status: box.state.status,
        fillPercent: box.state.fillPercent,
        trigger,
        events: events.length,
      },
    });
  });

  // ---------- Device management (admin) ----------

  const admin = [authenticate, ROLE.admin];
  const Params = z.object({ id: DEVICE_ID });
  const WithKey = DeviceSchema.extend({
    apiKey: z.string().openapi({ description: "Shown only once. Flash it into the device." }),
  });

  registry.registerPath({
    method: "get",
    path: "/api/devices",
    tags: ["Devices"],
    summary: "List devices (admin)",
    security,
    request: { query: z.object({ boxId: BOX_ID.optional() }) },
    responses: { 200: json(envelope(z.array(DeviceSchema))), 401: errors[401], 403: errors[403] },
  });
  router.get("/", ...admin, validate({ query: z.object({ boxId: BOX_ID.optional() }) }), async (req, res) => {
    const filter = req.valid.query.boxId ? { boxId: req.valid.query.boxId } : {};
    const devices = await Device.find(filter).sort({ _id: 1 });
    res.json({ data: devices.map((d) => d.toApi()) });
  });

  const CreateDevice = z.object({
    boxId: BOX_ID,
    name: z.string().trim().min(1).max(80).default("Sensor"),
    firmware: z.string().max(40).optional(),
  });
  registry.registerPath({
    method: "post",
    path: "/api/devices",
    tags: ["Devices"],
    summary: "Provision a device for a box and get its API key (admin)",
    security,
    request: { body: jsonBody(CreateDevice) },
    responses: { 201: json(envelope(WithKey), "Created"), 400: errors[400], 404: errors[404] },
  });
  router.post("/", ...admin, validate({ body: CreateDevice }), async (req, res) => {
    const { device, apiKey } = await provisionDevice(req.valid.body);
    await audit(req, "device.provision", "device", device._id, { boxId: device.boxId });
    res.status(201).json({ data: { ...device.toApi(), apiKey } });
  });

  registry.registerPath({
    method: "post",
    path: "/api/devices/{id}/rotate-key",
    tags: ["Devices"],
    summary: "Issue a new key; the old one stops working immediately (admin)",
    security,
    request: { params: Params },
    responses: { 200: json(envelope(WithKey)), 404: errors[404], 409: errors[409] },
  });
  router.post("/:id/rotate-key", ...admin, validate({ params: Params }), async (req, res) => {
    const { device, apiKey } = await rotateDeviceKey(req.valid.params.id);
    await audit(req, "device.rotate_key", "device", device._id);
    res.json({ data: { ...device.toApi(), apiKey } });
  });

  registry.registerPath({
    method: "post",
    path: "/api/devices/{id}/revoke",
    tags: ["Devices"],
    summary: "Revoke a lost or broken device (admin)",
    security,
    request: { params: Params },
    responses: { 200: json(envelope(DeviceSchema)), 404: errors[404] },
  });
  router.post("/:id/revoke", ...admin, validate({ params: Params }), async (req, res) => {
    const device = await revokeDevice(req.valid.params.id);
    await audit(req, "device.revoke", "device", device._id);
    res.json({ data: device.toApi() });
  });

  return router;
}
