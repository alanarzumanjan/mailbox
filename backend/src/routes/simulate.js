// Демо-кнопка "Simulate mail" (handleSimulateMail в CourierApp / DispatcherDashboard).
// Генерирует синтетическое показание и прогоняет его через тот же конвейер,
// что и настоящий датчик — события, уведомления и SSE работают как "вживую".
// Включается флагом ENABLE_SIMULATION; в проде выключить.
import { Router } from "express";
import { z } from "zod";
import { Box } from "../models/Box.js";
import { validate } from "../middleware/validate.js";
import { authenticate, ROLE } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";
import { registry, envelope, errors, json, jsonBody, bearerAuth } from "../lib/openapi.js";
import { BOX_ID, BoxSchema } from "../schemas.js";
import { ingestReading } from "../services/telemetry.js";
import { STATUS } from "../domain/fill.js";

const router = Router();
router.use(authenticate, ROLE.staff);

const Body = z.object({
  boxId: BOX_ID.optional(),
  district: z.string().optional().openapi({ description: "Pick the fullest non-full box here" }),
});

registry.registerPath({
  method: "post",
  path: "/api/simulate/mail",
  tags: ["Telemetry"],
  summary: "Demo: fill a postbox through the real telemetry pipeline (if ENABLE_SIMULATION)",
  security: [{ [bearerAuth.name]: [] }],
  request: { body: jsonBody(Body) },
  responses: { 201: json(envelope(BoxSchema), "Filled"), 409: errors[409] },
});

router.post("/mail", validate({ body: Body }), async (req, res) => {
  const { boxId, district } = req.valid.body;

  let box;
  if (boxId) {
    box = await Box.findOne({ _id: boxId, active: true });
  } else {
    // Как на фронте: берём самый заполненный из ещё не полных ящиков.
    const filter = { active: true, "state.status": { $ne: STATUS.FULL } };
    if (district && district !== "all") filter.district = district;
    box = await Box.findOne(filter).sort({ "state.fillPercent": -1 });
  }
  if (!box) throw new HttpError(409, "nothing_to_fill", "All postboxes in this zone are already full");

  const result = await ingestReading(
    box._id,
    { weightG: box.capacity.maxWeightG, distanceMm: box.state.distanceMm, battery: box.state.battery },
    { source: "simulation" },
  );
  res.status(201).json({ data: result.box.toApi() });
});

export default router;
