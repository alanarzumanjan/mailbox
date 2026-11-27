// Аналитика для диспетчера и бизнеса.
// Агрегация в приложении, а не в $group: объёмы за окно небольшие, а код
// одинаково работает в MongoDB и в Mongo-совместимых базах.
import { Box } from "../models/Box.js";
import { Reading } from "../models/Reading.js";
import { Pickup } from "../models/Pickup.js";
import { STATUS } from "../domain/fill.js";
import { optimizeRoute } from "../domain/route.js";
import { notFound } from "../middleware/errors.js";

const round1 = (x) => Math.round(x * 10) / 10;

/** Заполненность ящика по интервалам: для графика в карточке ящика. */
export async function fillHistory(boxId, { hours, bucketMin }) {
  if (!(await Box.exists({ _id: boxId }))) throw notFound(`Box ${boxId}`);
  const since = new Date(Date.now() - hours * 3600_000);
  const readings = await Reading.find({ boxId, createdAt: { $gte: since } })
    .select("fillPercent createdAt")
    .sort({ createdAt: 1 })
    .lean();

  const bucketMs = bucketMin * 60_000;
  const buckets = new Map();
  for (const r of readings) {
    const key = Math.floor(r.createdAt.getTime() / bucketMs) * bucketMs;
    const b = buckets.get(key) ?? { sum: 0, max: 0, count: 0 };
    b.sum += r.fillPercent;
    b.max = Math.max(b.max, r.fillPercent);
    b.count += 1;
    buckets.set(key, b);
  }
  return [...buckets].map(([t, b]) => ({
    at: new Date(t).toISOString(),
    avgFillPercent: round1(b.sum / b.count),
    maxFillPercent: b.max,
    readings: b.count,
  }));
}

/** Выемки по дням: количество, собранный вес, среднее время реакции. */
export async function pickupsByDay({ days }) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const pickups = await Pickup.find({ collectedAt: { $gte: since } })
    .select("collectedAt weightG responseMin")
    .lean();

  const result = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(since);
    day.setDate(since.getDate() + i);
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    const inDay = pickups.filter((p) => p.collectedAt >= day && p.collectedAt < next);
    const responses = inDay.map((p) => p.responseMin).filter((m) => m != null);
    result.push({
      date: day.toISOString().slice(0, 10),
      pickups: inDay.length,
      collectedKg: round1(inDay.reduce((s, p) => s + p.weightG, 0) / 1000),
      avgResponseMin: responses.length
        ? Math.round(responses.reduce((a, b) => a + b, 0) / responses.length)
        : null,
    });
  }
  return result;
}

/**
 * Экономия от умного маршрута: объезд только полных ящиков против
 * фиксированного графика, где курьер проезжает все ящики подряд.
 * Оба маршрута считаются одним и тем же оптимизатором — сравнение честное.
 */
export async function routeSavings({ depot, district, includeWarning, runsPerDay, model }) {
  const filter = { active: true };
  if (district && district !== "all") filter.district = district;
  const boxes = await Box.find(filter).lean();

  const smartStatuses = includeWarning ? [STATUS.FULL, STATUS.WARNING] : [STATUS.FULL];
  const toPoint = (b) => ({ id: b._id, lat: b.location.lat, lng: b.location.lng });

  const scenario = (list) => {
    const route = optimizeRoute(list.map(toPoint), depot);
    const km = route.totalDistanceKm;
    const minutes = (km / model.avgSpeedKmh) * 60 + list.length * model.stopMinutes;
    const fuelL = (km * model.fuelLPer100Km) / 100;
    return {
      stops: list.length,
      distanceKm: round1(km),
      durationMin: Math.round(minutes),
      fuelL: round1(fuelL),
      fuelCostEur: round1(fuelL * model.fuelPriceEur),
    };
  };

  const fixed = scenario(boxes);
  const smart = scenario(boxes.filter((b) => smartStatuses.includes(b.state.status)));

  const saved = {
    distanceKm: round1(fixed.distanceKm - smart.distanceKm),
    durationMin: fixed.durationMin - smart.durationMin,
    fuelL: round1(fixed.fuelL - smart.fuelL),
    fuelCostEur: round1(fixed.fuelCostEur - smart.fuelCostEur),
    stopsSkipped: fixed.stops - smart.stops,
    percent: fixed.distanceKm > 0 ? Math.round((1 - smart.distanceKm / fixed.distanceKm) * 100) : 0,
  };

  return {
    fixedSchedule: fixed,
    smartRoute: smart,
    saved,
    projectedYearly: {
      distanceKm: Math.round(saved.distanceKm * runsPerDay * 365),
      hours: Math.round((saved.durationMin * runsPerDay * 365) / 60),
      fuelCostEur: Math.round(saved.fuelCostEur * runsPerDay * 365),
    },
    assumptions: { ...model, runsPerDay, note: "Snapshot of current fill levels; straight-line distances" },
  };
}
