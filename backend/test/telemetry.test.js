// Devices, readings, events, offline detection, pickups, routing, boxes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { setupIntegration, skip, ctx, as, reading } from "./helpers.js";

setupIntegration();

const eventsOf = async (boxId, type) => {
  const q = new URLSearchParams({ boxId, limit: "100", ...(type && { type }) });
  return (await as("dispatcher").get(`/api/events?${q}`).expect(200)).body.data;
};

// ---------- Device keys ----------

test("device key is required and bound to its box", { skip }, async () => {
  await ctx.request(ctx.app).post("/api/devices/readings").send({ weight: 1 }).expect(401);
  await reading({ weight: 1 }, "eld_AAAAAAAAAA_" + "x".repeat(40)).expect(401);
  await reading({ weight: 1, boxId: "MG-002" }).expect(403);
  const ok = await reading({ weight: 1, boxId: "MG-001" }).expect(201);
  assert.equal(ok.body.data.boxId, "MG-001");
});

test("reading validation", { skip }, async () => {
  await reading({ weight: -5 }).expect(400);
  await reading({}).expect(400);
  await reading({ weight: 10, battery: 140 }).expect(400);
});

test("provision, rotate and revoke a device", { skip }, async () => {
  const created = await as("admin").post("/api/devices").send({ boxId: "MG-002" }).expect(201);
  const { id, apiKey } = created.body.data;
  assert.match(apiKey, /^eld_/);

  const list = await as("admin").get("/api/devices?boxId=MG-002").expect(200);
  assert.ok(!JSON.stringify(list.body).includes(apiKey), "key is shown only once");

  await reading({ weight: 100 }, apiKey).expect(201);

  const rotated = await as("admin").post(`/api/devices/${id}/rotate-key`).expect(200);
  await reading({ weight: 100 }, apiKey).expect(401);
  await reading({ weight: 100 }, rotated.body.data.apiKey).expect(201);

  await as("admin").post(`/api/devices/${id}/revoke`).expect(200);
  await reading({ weight: 100 }, rotated.body.data.apiKey).expect(401);
  await as("admin").post(`/api/devices/${id}/rotate-key`).expect(409);

  const audit = await as("admin").get(`/api/audit?targetId=${id}`).expect(200);
  assert.deepEqual(
    audit.body.data.map((a) => a.action).sort(),
    ["device.provision", "device.revoke", "device.rotate_key"],
  );
  await as("admin").post("/api/devices").send({ boxId: "MG-999" }).expect(404);
});

// ---------- Event rules ----------

test("filling a box emits exactly one critical event", { skip }, async () => {
  const r = await reading({ weight: 2000, distance: 250 }).expect(201);
  assert.equal(r.body.data.status, "full");
  await reading({ weight: 2010, distance: 250 }).expect(201); // jitter around the threshold
  assert.equal((await eventsOf("MG-001", "critical")).length, 1);

  const box = await as("dispatcher").get("/api/boxes/MG-001").expect(200);
  assert.ok(box.body.data.fullSince);
  assert.equal(box.body.data.online, true);
});

test("IR distance alone marks a light box as full", { skip }, async () => {
  const r = await reading({ weight: 150, distance: 30 }).expect(201);
  assert.equal(r.body.data.status, "full");
  assert.equal(r.body.data.trigger, "volume");
});

test("low battery warning fires once on crossing", { skip }, async () => {
  await reading({ weight: 100, battery: 19 }).expect(201);
  await reading({ weight: 100, battery: 18 }).expect(201);
  const low = (await eventsOf("MG-001", "warning")).filter((e) => e.message.startsWith("Low battery"));
  assert.equal(low.length, 1);
});

test("rapid fill is detected once within an hour", { skip }, async () => {
  for (const weight of [0, 500, 900, 1000]) await reading({ weight }).expect(201);
  const rapid = (await eventsOf("MG-001")).filter((e) => e.message.startsWith("Rapid fill"));
  assert.equal(rapid.length, 1);
});

test("silent sensors go offline once and come back online", { skip }, async () => {
  const { markOfflineDevices } = await import("../src/services/monitor.js");
  await reading({ weight: 100 }).expect(201);

  const later = Date.now() + 31 * 60_000;
  assert.deepEqual(await markOfflineDevices(30, later), ["MG-001"]);
  assert.deepEqual(await markOfflineDevices(30, later), [], "idempotent");

  const offline = await as("dispatcher").get("/api/boxes?online=false").expect(200);
  assert.deepEqual(offline.body.data.map((b) => b.id), ["MG-001"]);
  const stats = await as("dispatcher").get("/api/stats/overview").expect(200);
  assert.equal(stats.body.data.boxes.offline, 1);

  await reading({ weight: 100 }).expect(201);
  const msgs = (await eventsOf("MG-001")).map((e) => e.message);
  assert.ok(msgs.some((m) => m.startsWith("Sensor offline")));
  assert.ok(msgs.includes("Sensor back online"));
});

test("sensors that never reported are not flagged offline", { skip }, async () => {
  const { markOfflineDevices } = await import("../src/services/monitor.js");
  assert.deepEqual(await markOfflineDevices(30, Date.now() + 86400_000), []);
});

// ---------- Pickups and KPIs ----------

test("pickup empties the box, logs it and credits the courier", { skip }, async () => {
  await reading({ weight: 2000 }).expect(201);

  const res = await as("dispatcher").post("/api/boxes/MG-001/pickups").send({ courierId: "CR-01" }).expect(201);
  assert.equal(res.body.data.box.weight, 0);
  assert.equal(res.body.data.box.status, "normal");
  assert.equal(res.body.data.pickup.weight, 2000);
  assert.equal(res.body.data.pickup.responseMin, 0);

  const couriers = await as("dispatcher").get("/api/couriers").expect(200);
  assert.equal(couriers.body.data.find((c) => c.id === "CR-01").pickups, 8); // was 7
  assert.equal((await eventsOf("MG-001", "success")).length, 1);

  const stats = await as("dispatcher").get("/api/stats/overview").expect(200);
  assert.equal(stats.body.data.pickupsToday, 1);
  assert.equal(stats.body.data.avgResponseMin, 0);
  assert.equal(stats.body.data.responseOk, true);

  const history = await as("dispatcher").get("/api/boxes/MG-001/pickups").expect(200);
  assert.equal(history.body.data.length, 1);

  await as("dispatcher").post("/api/boxes/MG-001/pickups").send({ courierId: "CR-99" }).expect(404);
});

// ---------- Routing ----------

test("route covers all full boxes optimally and filters by district", { skip }, async () => {
  const full = await as("courier").get("/api/boxes?status=full").expect(200);
  const all = await as("courier").post("/api/routes/optimize").send({}).expect(200);
  assert.equal(all.body.data.algorithm, "held-karp");
  assert.deepEqual(all.body.data.stops.map((s) => s.id).sort(), full.body.data.map((b) => b.id).sort());

  const pard = await as("courier").post("/api/routes/optimize").send({ district: "pardaugava" }).expect(200);
  const pardIds = new Set((await as("courier").get("/api/boxes?district=pardaugava")).body.data.map((b) => b.id));
  assert.ok(pard.body.data.stops.length > 0);
  assert.ok(pard.body.data.stops.every((s) => pardIds.has(s.id)));

  const explicit = await as("courier")
    .post("/api/routes/optimize")
    .send({ boxIds: ["MG-001", "MG-013"], depot: { lat: 56.95, lng: 24.1 } })
    .expect(200);
  assert.equal(explicit.body.data.stops.length, 2);
});

// ---------- Boxes ----------

test("boxes in the frontend shape, with filters", { skip }, async () => {
  const res = await as("courier").get("/api/boxes").expect(200);
  assert.equal(res.body.data.length, 14);
  for (const key of ["id", "name", "address", "district", "lat", "lng", "weight", "max", "battery", "status"]) {
    assert.ok(key in res.body.data[0], `missing ${key}`);
  }
  const low = await as("courier").get("/api/boxes?lowBattery=true").expect(200);
  assert.ok(low.body.data.length > 0 && low.body.data.every((b) => b.battery <= 20));

  await as("courier").get("/api/boxes/MG-999").expect(404);
  await as("courier").get("/api/boxes/nope").expect(400);
});

test("admin registers, recalibrates and decommissions a box", { skip }, async () => {
  const created = await as("admin")
    .post("/api/boxes")
    .send({ name: "Freedom Monument", address: "Brīvības bulvāris, Riga", lat: 56.9514, lng: 24.1132 })
    .expect(201);
  assert.equal(created.body.data.id, "MG-015");
  assert.equal(created.body.data.district, "centrs");

  const updated = await as("admin").patch("/api/boxes/MG-015").send({ capacity: { maxWeightG: 1000 } }).expect(200);
  assert.equal(updated.body.data.max, 1000);
  await as("admin")
    .patch("/api/boxes/MG-015")
    .send({ capacity: { emptyDistanceMm: 10, fullDistanceMm: 50 } })
    .expect(400);

  await as("admin").delete("/api/boxes/MG-015").expect(204);
  await as("admin").get("/api/boxes/MG-015").expect(404);
  const actions = (await as("admin").get("/api/audit?targetId=MG-015")).body.data.map((a) => a.action);
  assert.deepEqual(actions.sort(), ["box.create", "box.decommission", "box.update"]);
});

test("simulate fills the fullest non-full box through the real pipeline", { skip }, async () => {
  const res = await as("dispatcher").post("/api/simulate/mail").send({ district: "centrs" }).expect(201);
  assert.equal(res.body.data.status, "full");
  assert.equal((await eventsOf(res.body.data.id, "critical")).length, 1);
  // A simulation is not a real sensor: online status does not change
  assert.equal(res.body.data.online, null);
});
