import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLine, shouldSend } from "./parse.js";

test("JSON line", () => {
  assert.deepEqual(parseLine('{"weight":1850.4,"distance":120,"battery":86}'), {
    weight: 1850, distance: 120, battery: 86,
  });
});

test("CSV line", () => {
  assert.deepEqual(parseLine("1850,120"), { weight: 1850, distance: 120 });
  assert.deepEqual(parseLine("1850;120;77"), { weight: 1850, distance: 120, battery: 77 });
  assert.deepEqual(parseLine("42"), { weight: 42 });
});

test("human readable line with units", () => {
  assert.deepEqual(parseLine("Weight: 1.25 kg | Distance: 12.5 cm"), { weight: 1250, distance: 125 });
  assert.deepEqual(parseLine("Вес: 300 г  Расстояние: 80 мм"), { weight: 300, distance: 80 });
});

test("negative weight after tare is clamped to zero", () => {
  assert.equal(parseLine("-3,200").weight, 0);
});

test("garbage and boot messages are ignored", () => {
  assert.equal(parseLine(""), null);
  assert.equal(parseLine("HX711 ready, calibrating..."), null);
  assert.equal(parseLine("{broken json"), null);
});

test("sends on change or after silence, not on noise", () => {
  const t = { minWeightDeltaG: 10, minDistanceDeltaMm: 5, maxSilenceMs: 60_000 };
  const prev = { reading: { weight: 100, distance: 200 }, at: 0 };
  assert.equal(shouldSend(null, { weight: 1 }, t, 0), true);
  assert.equal(shouldSend(prev, { weight: 104, distance: 202 }, t, 1000), false);
  assert.equal(shouldSend(prev, { weight: 120, distance: 200 }, t, 1000), true);
  assert.equal(shouldSend(prev, { weight: 100, distance: 150 }, t, 1000), true);
  assert.equal(shouldSend(prev, { weight: 100, distance: 200 }, t, 61_000), true);
});
