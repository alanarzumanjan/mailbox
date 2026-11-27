// Platform: realtime, notifications, pagination, analytics, docs, errors, limits.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { setupIntegration, skip, ctx, as, reading } from "./helpers.js";

setupIntegration({ appOptions: { heartbeatMs: 200 } });

// ---------- SSE ----------

function openStream(server, token) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    const received = [];
    const req = http.get(`http://127.0.0.1:${port}/api/stream?access_token=${token}`, (res) => {
      res.setEncoding("utf8");
      let buf = "";
      res.on("data", (chunk) => {
        buf += chunk;
        let i;
        while ((i = buf.indexOf("\n\n")) !== -1) {
          const block = buf.slice(0, i);
          buf = buf.slice(i + 2);
          const event = /^event: (.+)$/m.exec(block)?.[1];
          const data = /^data: (.+)$/m.exec(block)?.[1];
          if (event) received.push({ event, data: JSON.parse(data) });
          if (block.startsWith(": ping")) received.push({ event: "ping" });
        }
      });
      resolve({ res, received, close: () => req.destroy() });
    });
    req.on("error", reject);
  });
}

const waitFor = async (fn, ms = 3000) => {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error("timed out waiting for condition");
};

test("SSE stream delivers live box and event updates", { skip }, async () => {
  const server = ctx.app.listen(0);
  try {
    const stream = await openStream(server, ctx.tokens.dispatcher);
    assert.equal(stream.res.statusCode, 200);
    assert.match(stream.res.headers["content-type"], /text\/event-stream/);

    await waitFor(() => stream.received.some((e) => e.event === "ready"));
    await reading({ weight: 2000 }).expect(201);

    await waitFor(() => stream.received.some((e) => e.event === "event.created"));
    const box = stream.received.find((e) => e.event === "box.updated");
    assert.equal(box.data.id, "MG-001");
    assert.equal(box.data.status, "full");
    const ev = stream.received.find((e) => e.event === "event.created");
    assert.equal(ev.data.type, "critical");

    await waitFor(() => stream.received.some((e) => e.event === "ping"));
    stream.close();
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

test("SSE stream requires a valid token", { skip }, async () => {
  await ctx.request(ctx.app).get("/api/stream").expect(401);
  await ctx.request(ctx.app).get("/api/stream?access_token=bad").expect(401);
});

// ---------- Notifications ----------

test("critical events are pushed to the webhook; others are not", { skip }, async () => {
  const hits = [];
  const hook = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      hits.push(JSON.parse(body));
      res.end("ok");
    });
  });
  await new Promise((r) => hook.listen(0, r));
  const { createNotifier } = await import("../src/services/notifications.js");
  const notifier = createNotifier({ webhookUrl: `http://127.0.0.1:${hook.address().port}/hook` });
  notifier.start();
  try {
    await reading({ weight: 100, battery: 10 }).expect(201); // warning, no notification
    await reading({ weight: 2000 }).expect(201); // critical
    await waitFor(() => hits.length >= 1);
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(hits.length, 1);
    assert.match(hits[0].text, /Capacity reached/);
    assert.match(hits[0].text, /Old Town/);
    assert.equal(hits[0].event.boxId, "MG-001");
  } finally {
    notifier.stop();
    hook.close();
  }
});

test("a failing channel does not break telemetry", { skip }, async () => {
  const { createNotifier } = await import("../src/services/notifications.js");
  const notifier = createNotifier({ webhookUrl: "http://127.0.0.1:9/unreachable" });
  notifier.start();
  try {
    await reading({ weight: 2000 }).expect(201);
  } finally {
    notifier.stop();
  }
});

// ---------- Pagination ----------

test("events paginate by cursor without gaps or duplicates", { skip }, async () => {
  const all = (await as("dispatcher").get("/api/events?limit=100").expect(200)).body.data;
  assert.equal(all.length, 10);

  const seen = [];
  let cursor;
  do {
    const q = cursor ? `?limit=3&cursor=${cursor}` : "?limit=3";
    const page = await as("dispatcher").get(`/api/events${q}`).expect(200);
    seen.push(...page.body.data.map((e) => e.id));
    cursor = page.body.nextCursor;
  } while (cursor);
  assert.deepEqual(seen, all.map((e) => e.id));

  await as("dispatcher").get("/api/events?cursor=garbage").expect(400);
});

test("events since a timestamp (polling)", { skip }, async () => {
  const since = new Date().toISOString();
  await reading({ weight: 2000 }).expect(201);
  const res = await as("dispatcher").get(`/api/events?since=${encodeURIComponent(since)}`).expect(200);
  assert.equal(res.body.data.length, 1);
});

// ---------- Analytics ----------

test("savings: smart route is shorter than the fixed schedule", { skip }, async () => {
  const res = await as("dispatcher").get("/api/analytics/savings").expect(200);
  const d = res.body.data;
  assert.equal(d.fixedSchedule.stops, 14);
  assert.equal(d.smartRoute.stops, 3);
  assert.ok(d.smartRoute.distanceKm < d.fixedSchedule.distanceKm);
  assert.ok(d.saved.percent > 0 && d.saved.percent < 100);
  assert.ok(d.projectedYearly.distanceKm > 0);

  const district = await as("dispatcher").get("/api/analytics/savings?district=teika&runsPerDay=2").expect(200);
  assert.ok(district.body.data.fixedSchedule.stops < 14);
  assert.equal(district.body.data.assumptions.runsPerDay, 2);
});

test("fill history and pickups per day", { skip }, async () => {
  for (const weight of [200, 600, 1200]) await reading({ weight }).expect(201);
  const hist = await as("dispatcher").get("/api/analytics/fill-history?boxId=MG-001&hours=2&bucketMin=60").expect(200);
  assert.ok(hist.body.data.length >= 1);
  assert.equal(hist.body.data.reduce((s, b) => s + b.readings, 0), 3);

  await as("dispatcher").post("/api/boxes/MG-001/pickups").send({}).expect(201);
  const days = await as("dispatcher").get("/api/analytics/pickups?days=7").expect(200);
  assert.equal(days.body.data.length, 7);
  assert.equal(days.body.data.at(-1).pickups, 1);
  assert.equal(days.body.data.at(-1).collectedKg, 1.2);

  await as("dispatcher").get("/api/analytics/fill-history?boxId=MG-999").expect(404);
});

// ---------- Docs and errors ----------

test("OpenAPI document covers the API and Swagger UI is served", { skip }, async () => {
  const doc = (await ctx.request(ctx.app).get("/openapi.json").expect(200)).body;
  assert.equal(doc.openapi, "3.1.0");
  for (const path of ["/api/auth/login", "/api/boxes", "/api/devices/readings", "/api/routes/optimize",
    "/api/analytics/savings", "/api/stream", "/health"]) {
    assert.ok(doc.paths[path], `missing ${path} in OpenAPI`);
  }
  assert.ok(doc.components.securitySchemes.bearerAuth);
  await ctx.request(ctx.app).get("/docs/").expect(200);
});

test("health, request id and security headers", { skip }, async () => {
  const res = await ctx.request(ctx.app).get("/health").set("x-request-id", "abc-123").expect(200);
  assert.equal(res.body.status, "ok");
  assert.equal(res.headers["x-request-id"], "abc-123");
  assert.equal(res.headers["x-content-type-options"], "nosniff");
  assert.equal(res.headers["x-powered-by"], undefined);
});

test("consistent error format", { skip }, async () => {
  const nf = await ctx.request(ctx.app).get("/api/nope").expect(404);
  assert.equal(nf.body.error.code, "not_found");
  const bad = await ctx.request(ctx.app)
    .post("/api/auth/login")
    .set("content-type", "application/json")
    .send("{bad json")
    .expect(400);
  assert.equal(bad.body.error.code, "bad_json");
  const invalid = await as("admin").post("/api/boxes").send({ name: "" }).expect(400);
  assert.equal(invalid.body.error.code, "validation_error");
  assert.ok(invalid.body.error.details.fieldErrors);
});

test("login is rate limited", { skip }, async () => {
  const { createApp } = await import("../src/app.js");
  const limited = createApp({ rateLimit: true });
  let last;
  for (let i = 0; i < 21; i++) {
    last = await ctx.request(limited).post("/api/auth/login").send({ email: "x@emptyless.lv", password: "nope" });
  }
  assert.equal(last.status, 429);
  assert.equal(last.body.error.code, "rate_limited");
});
