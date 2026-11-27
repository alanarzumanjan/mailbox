// Оптимизация маршрута курьера.
// Заменяет сортировку по долготе в components/CourierApp.js на настоящий TSP.
import { Router } from "express";
import { z } from "zod";
import { Box } from "../models/Box.js";
import { validate } from "../middleware/validate.js";
import { authenticate, ROLE } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";
import { registry, envelope, errors, json, jsonBody, bearerAuth } from "../lib/openapi.js";
import { BOX_ID, LatLng, RouteSchema } from "../schemas.js";
import { optimizeRoute } from "../domain/route.js";
import { DEFAULT_DEPOT } from "../domain/geo.js";
import { STATUS } from "../domain/fill.js";

const router = Router();
router.use(authenticate, ROLE.staff);

const MAX_STOPS = 60;

const OptimizeBody = z.object({
  depot: LatLng.optional().openapi({ description: "Courier start point; defaults to Riga centre" }),
  district: z.string().optional().openapi({ example: "centrs" }),
  boxIds: z.array(BOX_ID).min(1).max(MAX_STOPS).optional()
    .openapi({ description: "Explicit stops; otherwise all full boxes in the district" }),
  includeWarning: z.boolean().default(false).openapi({ description: "Also visit boxes ≥75%" }),
});

registry.registerPath({
  method: "post",
  path: "/api/routes/optimize",
  tags: ["Routing"],
  summary: "Optimal visiting order for full postboxes",
  description:
    "Up to 12 stops: exact Held-Karp (guaranteed shortest). More: nearest neighbour + 2-opt. " +
    "Straight-line (haversine) distances; road geometry is drawn by OSRM on the client.",
  security: [{ [bearerAuth.name]: [] }],
  request: { body: jsonBody(OptimizeBody) },
  responses: { 200: json(envelope(RouteSchema)), 400: errors[400], 422: errors[422] },
});

router.post("/optimize", validate({ body: OptimizeBody }), async (req, res) => {
  const { depot = DEFAULT_DEPOT, district, boxIds, includeWarning } = req.valid.body;

  const filter = { active: true };
  if (boxIds) {
    filter._id = { $in: boxIds };
  } else {
    filter["state.status"] = { $in: includeWarning ? [STATUS.FULL, STATUS.WARNING] : [STATUS.FULL] };
    if (district && district !== "all") filter.district = district;
  }

  const boxes = await Box.find(filter);
  if (boxes.length > MAX_STOPS) {
    throw new HttpError(422, "too_many_stops", `Route supports up to ${MAX_STOPS} stops`);
  }

  const points = boxes.map((b) => ({ id: b._id, lat: b.location.lat, lng: b.location.lng }));
  const result = optimizeRoute(points, depot);
  const byId = new Map(boxes.map((b) => [b._id, b]));

  res.json({
    data: {
      depot,
      algorithm: result.algorithm,
      totalDistanceKm: result.totalDistanceKm,
      stops: result.order.map((id, i) => {
        const b = byId.get(id);
        return {
          order: i + 1,
          id,
          name: b.name,
          lat: b.location.lat,
          lng: b.location.lng,
          fillPercent: b.state.fillPercent,
          legKm: result.legsKm[i],
        };
      }),
    },
  });
});

export default router;
