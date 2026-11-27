import { test } from "node:test";
import assert from "node:assert/strict";
import { computeFill, statusFromPercent, volumePercent, isLowBattery } from "../src/domain/fill.js";
import { optimizeRoute, EXACT_LIMIT } from "../src/domain/route.js";
import { haversineKm, districtFromLocation } from "../src/domain/geo.js";

const cap = { maxWeightG: 2000, emptyDistanceMm: 300, fullDistanceMm: 40 };

test("status thresholds match the frontend (75% warning, 100% full)", () => {
  assert.equal(statusFromPercent(74), "normal");
  assert.equal(statusFromPercent(75), "warning");
  assert.equal(statusFromPercent(99), "warning");
  assert.equal(statusFromPercent(100), "full");
});

test("light letters that reach the top count as full via the IR sensor", () => {
  const r = computeFill({ weightG: 200, distanceMm: 40 }, cap);
  assert.equal(r.fillPercent, 100);
  assert.equal(r.status, "full");
  assert.equal(r.trigger, "volume");
});

test("heavy letters count as full by weight even when the top is clear", () => {
  const r = computeFill({ weightG: 2100, distanceMm: 280 }, cap);
  assert.equal(r.status, "full");
  assert.equal(r.trigger, "weight");
});

test("missing distance falls back to weight only", () => {
  assert.equal(computeFill({ weightG: 1000, distanceMm: null }, cap).fillPercent, 50);
});

test("volume percent is clamped and ignores bad calibration", () => {
  assert.equal(volumePercent(500, 300, 40), 0);
  assert.equal(volumePercent(10, 300, 40), 100);
  assert.equal(volumePercent(100, 40, 300), 0);
});

test("low battery threshold is 20%", () => {
  assert.equal(isLowBattery(20), true);
  assert.equal(isLowBattery(21), false);
  assert.equal(isLowBattery(null), false);
});

test("district rule matches the frontend", () => {
  assert.equal(districtFromLocation({ lat: 56.9385, lng: 24.0812 }), "pardaugava");
  assert.equal(districtFromLocation({ lat: 56.9685, lng: 24.1495 }), "teika");
  assert.equal(districtFromLocation({ lat: 56.9496, lng: 24.1052 }), "centrs");
});

test("haversine is roughly right for Riga", () => {
  // Старый город → Тейка, около 3 км
  const d = haversineKm({ lat: 56.9496, lng: 24.1052 }, { lat: 56.9685, lng: 24.1495 });
  assert.ok(d > 2.5 && d < 3.5, `got ${d}`);
});

// --- маршрут ---

function bruteForceBest(points, depot) {
  let best = Infinity;
  const permute = (rest, last, acc) => {
    if (acc >= best) return;
    if (rest.length === 0) {
      best = acc;
      return;
    }
    rest.forEach((p, i) =>
      permute([...rest.slice(0, i), ...rest.slice(i + 1)], p, acc + haversineKm(last, p)),
    );
  };
  permute(points, depot, 0);
  return best;
}

function randomPoints(n, seed) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, (_, i) => ({
    id: `MG-${String(i + 1).padStart(3, "0")}`,
    lat: 56.92 + rnd() * 0.08,
    lng: 24.0 + rnd() * 0.22,
  }));
}

const depot = { lat: 56.9515, lng: 24.112 };

test("empty and single-stop routes", () => {
  assert.deepEqual(optimizeRoute([], depot).order, []);
  const one = optimizeRoute([{ id: "MG-001", lat: 56.95, lng: 24.1 }], depot);
  assert.deepEqual(one.order, ["MG-001"]);
  assert.equal(one.legsKm.length, 1);
});

test("Held-Karp is optimal (matches brute force) for small inputs", () => {
  for (let seed = 1; seed <= 15; seed++) {
    const pts = randomPoints(2 + (seed % 7), seed);
    const r = optimizeRoute(pts, depot);
    assert.equal(r.algorithm, "held-karp");
    assert.equal(new Set(r.order).size, pts.length, "visits every stop exactly once");
    assert.ok(
      Math.abs(r.totalDistanceKm - bruteForceBest(pts, depot)) < 0.01,
      `seed ${seed}: ${r.totalDistanceKm} vs optimum`,
    );
  }
});

test("legs add up to the total", () => {
  const r = optimizeRoute(randomPoints(8, 42), depot);
  const sum = r.legsKm.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - r.totalDistanceKm) < 0.05);
});

test("large inputs use the heuristic and still visit every stop", () => {
  const pts = randomPoints(EXACT_LIMIT + 20, 7);
  const t0 = performance.now();
  const r = optimizeRoute(pts, depot);
  assert.equal(r.algorithm, "nearest-neighbour+2opt");
  assert.equal(new Set(r.order).size, pts.length);
  assert.ok(performance.now() - t0 < 500, "fast enough for a request handler");
});
