// Shared integration test harness: a temporary database per file,
// a fresh seed before each test, ready tokens for every role.
import { before, after, beforeEach } from "node:test";

export const BASE_URI = process.env.TEST_MONGODB_URI;
export const skip = !BASE_URI && "set TEST_MONGODB_URI to run API tests";

export const ctx = {};

export function setupIntegration({ appOptions = {} } = {}) {
  before(async () => {
    if (skip) return;
    Object.assign(process.env, {
      NODE_ENV: "test",
      BCRYPT_ROUNDS: "4",
      READING_RETENTION_DAYS: process.env.READING_RETENTION_DAYS ?? "0",
    });
    ctx.request = (await import("supertest")).default;
    ctx.mongoose = (await import("mongoose")).default;
    const { createApp } = await import("../src/app.js");
    const seed = await import("../src/seed/seed.js");
    ctx.seedDatabase = seed.seedDatabase;
    ctx.DEMO_USERS = seed.DEMO_USERS;

    const dbName = `emptyless_test_${process.pid}_${Date.now()}`;
    await ctx.mongoose.connect(`${BASE_URI.replace(/\/$/, "")}/${dbName}`);
    ctx.app = createApp({ rateLimit: false, ...appOptions });
  });

  after(async () => {
    if (skip) return;
    await ctx.mongoose.connection.dropDatabase();
    await ctx.mongoose.disconnect();
  });

  beforeEach(async () => {
    if (skip) return;
    const { deviceKey, deviceId } = await ctx.seedDatabase({ quiet: true });
    ctx.deviceKey = deviceKey;
    ctx.deviceId = deviceId;
    ctx.tokens = {};
    for (const u of ctx.DEMO_USERS) {
      const res = await ctx.request(ctx.app)
        .post("/api/auth/login")
        .send({ email: u.email, password: u.password });
      if (res.status !== 200) throw new Error(`login ${u.email} failed: ${res.status}`);
      ctx.tokens[u.role] = res.body.data.accessToken;
      ctx[`${u.role}Refresh`] = res.body.data.refreshToken;
    }
  });

  return ctx;
}

/** Request as a role: as("admin").get("/api/users") */
export const as = (role) => {
  const agent = ctx.request(ctx.app);
  const withAuth = (method) => (url) => agent[method](url).set("authorization", `Bearer ${ctx.tokens[role]}`);
  return {
    get: withAuth("get"),
    post: withAuth("post"),
    patch: withAuth("patch"),
    delete: withAuth("delete"),
  };
};

export const reading = (body, key = ctx.deviceKey) =>
  ctx.request(ctx.app).post("/api/devices/readings").set("x-device-key", key).send(body);
