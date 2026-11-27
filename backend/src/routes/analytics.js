import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { authenticate, ROLE } from "../middleware/auth.js";
import { registry, envelope, json, errors, bearerAuth } from "../lib/openapi.js";
import { BOX_ID } from "../schemas.js";
import { DEFAULT_DEPOT } from "../domain/geo.js";
import { fillHistory, pickupsByDay, routeSavings } from "../services/analytics.js";

export function createAnalyticsRouter({ economics }) {
  const router = Router();
  router.use(authenticate, ROLE.dispatch);
  const security = [{ [bearerAuth.name]: [] }];

  const FillQuery = z.object({
    boxId: BOX_ID,
    hours: z.coerce.number().int().min(1).max(24 * 30).default(24),
    bucketMin: z.coerce.number().int().min(5).max(24 * 60).default(60),
  });
  registry.registerPath({
    method: "get",
    path: "/api/analytics/fill-history",
    tags: ["Analytics"],
    summary: "Fill level of one postbox over time, in buckets",
    security,
    request: { query: FillQuery },
    responses: {
      200: json(envelope(z.array(z.object({
        at: z.string().datetime(), avgFillPercent: z.number(), maxFillPercent: z.number(), readings: z.number(),
      })))),
      404: errors[404],
    },
  });
  router.get("/fill-history", validate({ query: FillQuery }), async (req, res) => {
    const { boxId, ...opts } = req.valid.query;
    res.json({ data: await fillHistory(boxId, opts) });
  });

  const PickupsQuery = z.object({ days: z.coerce.number().int().min(1).max(90).default(7) });
  registry.registerPath({
    method: "get",
    path: "/api/analytics/pickups",
    tags: ["Analytics"],
    summary: "Pickups per day: count, collected kg, average response time",
    security,
    request: { query: PickupsQuery },
    responses: {
      200: json(envelope(z.array(z.object({
        date: z.string(), pickups: z.number(), collectedKg: z.number(), avgResponseMin: z.number().nullable(),
      })))),
    },
  });
  router.get("/pickups", validate({ query: PickupsQuery }), async (req, res) => {
    res.json({ data: await pickupsByDay(req.valid.query) });
  });

  const SavingsQuery = z.object({
    district: z.string().optional(),
    includeWarning: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
    runsPerDay: z.coerce.number().min(0.1).max(10).default(1),
    depotLat: z.coerce.number().min(-90).max(90).optional(),
    depotLng: z.coerce.number().min(-180).max(180).optional(),
  });
  const Scenario = z.object({
    stops: z.number(), distanceKm: z.number(), durationMin: z.number(), fuelL: z.number(), fuelCostEur: z.number(),
  });
  registry.registerPath({
    method: "get",
    path: "/api/analytics/savings",
    tags: ["Analytics"],
    summary: "Smart route (full boxes only) vs fixed schedule (every box): km, time, fuel, € and yearly projection",
    security,
    request: { query: SavingsQuery },
    responses: {
      200: json(envelope(z.object({
        fixedSchedule: Scenario,
        smartRoute: Scenario,
        saved: z.object({
          distanceKm: z.number(), durationMin: z.number(), fuelL: z.number(),
          fuelCostEur: z.number(), stopsSkipped: z.number(), percent: z.number(),
        }),
        projectedYearly: z.object({ distanceKm: z.number(), hours: z.number(), fuelCostEur: z.number() }),
        assumptions: z.record(z.any()),
      }))),
    },
  });
  router.get("/savings", validate({ query: SavingsQuery }), async (req, res) => {
    const { depotLat, depotLng, ...opts } = req.valid.query;
    const depot = depotLat != null && depotLng != null ? { lat: depotLat, lng: depotLng } : DEFAULT_DEPOT;
    res.json({ data: await routeSavings({ ...opts, depot, model: economics }) });
  });

  return router;
}
