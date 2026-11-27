import { test } from "node:test";
import assert from "node:assert/strict";
import { setupIntegration, skip, ctx, as } from "./helpers.js";

setupIntegration();

const login = (email, password) => ctx.request(ctx.app).post("/api/auth/login").send({ email, password });
const refresh = (refreshToken) => ctx.request(ctx.app).post("/api/auth/refresh").send({ refreshToken });

test("login returns tokens and the user", { skip }, async () => {
  const res = await login("dispatcher@emptyless.lv", "dispatch-demo-2026").expect(200);
  const d = res.body.data;
  assert.ok(d.accessToken && d.refreshToken);
  assert.equal(d.tokenType, "Bearer");
  assert.equal(d.user.role, "dispatcher");
  assert.equal(d.user.passwordHash, undefined, "never leak the hash");
});

test("wrong password and unknown email look identical", { skip }, async () => {
  const a = await login("dispatcher@emptyless.lv", "wrong-password").expect(401);
  const b = await login("nobody@emptyless.lv", "wrong-password").expect(401);
  assert.deepEqual(a.body, b.body);
});

test("me returns the current user", { skip }, async () => {
  const res = await as("courier").get("/api/auth/me").expect(200);
  assert.equal(res.body.data.courierId, "CR-01");
});

test("missing, malformed and forged tokens are rejected", { skip }, async () => {
  await ctx.request(ctx.app).get("/api/boxes").expect(401);
  await ctx.request(ctx.app).get("/api/boxes").set("authorization", "Bearer nope").expect(401);
  const [h, p] = ctx.tokens.admin.split(".");
  const forged = `${h}.${p}.c2lnbmF0dXJl`;
  const res = await ctx.request(ctx.app).get("/api/boxes").set("authorization", `Bearer ${forged}`).expect(401);
  assert.equal(res.body.error.code, "invalid_token");
});

test("refresh rotates tokens; reusing an old one revokes the whole session", { skip }, async () => {
  const first = ctx.dispatcherRefresh;
  const r1 = await refresh(first).expect(200);
  const second = r1.body.data.refreshToken;
  assert.notEqual(second, first);

  // Кто-то повторно предъявил уже использованный токен — признак кражи
  const reuse = await refresh(first).expect(401);
  assert.equal(reuse.body.error.code, "token_reused");

  // И новый токен этой сессии тоже больше не работает
  await refresh(second).expect(401);
});

test("logout revokes the session", { skip }, async () => {
  await ctx.request(ctx.app).post("/api/auth/logout").send({ refreshToken: ctx.adminRefresh }).expect(204);
  await refresh(ctx.adminRefresh).expect(401);
});

test("Google sign-in reports when it is not configured", { skip }, async () => {
  const res = await ctx.request(ctx.app).post("/api/auth/google").send({ idToken: "x".repeat(40) }).expect(501);
  assert.equal(res.body.error.code, "not_configured");
});

// ---------- Роли ----------

test("role permissions", { skip }, async () => {
  // Курьер видит ящики и маршрут, но не управляет системой
  await as("courier").get("/api/boxes").expect(200);
  await as("courier").post("/api/routes/optimize").send({}).expect(200);
  await as("courier").get("/api/stats/overview").expect(403);
  await as("courier").get("/api/boxes/MG-001/readings").expect(403);
  await as("courier").post("/api/boxes").send({ name: "x", address: "y", lat: 56.9, lng: 24.1 }).expect(403);

  // Диспетчер — оперативная работа, но не пользователи и не датчики
  await as("dispatcher").get("/api/stats/overview").expect(200);
  await as("dispatcher").get("/api/users").expect(403);
  await as("dispatcher").get("/api/devices").expect(403);
  await as("dispatcher").get("/api/audit").expect(403);

  await as("admin").get("/api/users").expect(200);
  await as("admin").get("/api/audit").expect(200);
});

test("couriers record pickups only as themselves", { skip }, async () => {
  await as("courier").post("/api/boxes/MG-006/pickups").send({ courierId: "CR-02" }).expect(403);

  const res = await as("courier").post("/api/boxes/MG-006/pickups").send({}).expect(201);
  assert.equal(res.body.data.pickup.courierId, "CR-01");
});

test("couriers update only their own status and note", { skip }, async () => {
  await as("courier").patch("/api/couriers/CR-01").send({ status: "at_pickup", note: "MG-006" }).expect(200);
  await as("courier").patch("/api/couriers/CR-02").send({ status: "break" }).expect(403);
  await as("courier").patch("/api/couriers/CR-01").send({ district: "teika" }).expect(403);
  await as("dispatcher").patch("/api/couriers/CR-02").send({ district: "teika" }).expect(200);
});

// ---------- Пользователи ----------

test("admin manages users; disabling signs the user out", { skip }, async () => {
  const created = await as("admin")
    .post("/api/users")
    .send({ email: "Anna@EmptyLess.lv", name: "Anna", role: "dispatcher", password: "anna-password-1" })
    .expect(201);
  assert.equal(created.body.data.email, "anna@emptyless.lv", "email is normalised");

  await as("admin")
    .post("/api/users")
    .send({ email: "anna@emptyless.lv", name: "Dup", role: "dispatcher" })
    .expect(409);

  const session = await login("anna@emptyless.lv", "anna-password-1").expect(200);

  await as("admin").patch(`/api/users/${created.body.data.id}`).send({ active: false }).expect(200);
  await login("anna@emptyless.lv", "anna-password-1").expect(401);
  await refresh(session.body.data.refreshToken).expect(401);

  const auditLog = await as("admin").get(`/api/audit?targetId=${created.body.data.id}`).expect(200);
  assert.deepEqual(auditLog.body.data.map((a) => a.action).sort(), ["user.create", "user.update"]);
  assert.ok(!JSON.stringify(auditLog.body).includes("anna-password-1"), "no passwords in audit");
});

test("user validation", { skip }, async () => {
  await as("admin").post("/api/users").send({ email: "c@emptyless.lv", name: "C", role: "courier" }).expect(400);
  await as("admin")
    .post("/api/users")
    .send({ email: "c@emptyless.lv", name: "C", role: "dispatcher", password: "short" })
    .expect(400);
});

test("admin cannot disable or demote themselves", { skip }, async () => {
  const me = await as("admin").get("/api/auth/me").expect(200);
  await as("admin").patch(`/api/users/${me.body.data.id}`).send({ active: false }).expect(409);
  await as("admin").patch(`/api/users/${me.body.data.id}`).send({ role: "courier" }).expect(409);
});
