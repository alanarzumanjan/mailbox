import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import { registry, envelope, errors, json, jsonBody, bearerAuth } from "../lib/openapi.js";
import { UserSchema } from "../schemas.js";
import { User } from "../models/User.js";
import { notFound } from "../middleware/errors.js";
import * as auth from "../services/auth.js";

export function createAuthRouter({ limiter }) {
  const router = Router();
  const meta = (req) => ({ ip: req.ip, userAgent: req.get("user-agent") });

  const Session = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    tokenType: z.literal("Bearer"),
    expiresIn: z.number().openapi({ description: "Access token lifetime, seconds" }),
    user: UserSchema,
  });

  const LoginBody = z.object({
    email: z.string().trim().email().openapi({ example: "dispatcher@emptyless.lv" }),
    password: z.string().min(1).max(200),
  });
  registry.registerPath({
    method: "post",
    path: "/auth/login",
    tags: ["Auth"],
    summary: "Sign in with email and password",
    request: { body: jsonBody(LoginBody) },
    responses: { 200: json(envelope(Session)), 400: errors[400], 401: errors[401], 429: errors[429] },
  });
  router.post("/login", limiter, validate({ body: LoginBody }), async (req, res) => {
    const { email, password } = req.valid.body;
    res.json({ data: await auth.loginWithPassword(email, password, meta(req)) });
  });

  const GoogleBody = z.object({ idToken: z.string().min(10) });
  registry.registerPath({
    method: "post",
    path: "/auth/google",
    tags: ["Auth"],
    summary: "Sign in with a Google ID token (only for users an admin has added)",
    request: { body: jsonBody(GoogleBody) },
    responses: { 200: json(envelope(Session)), 401: errors[401], 403: errors[403] },
  });
  router.post("/google", limiter, validate({ body: GoogleBody }), async (req, res) => {
    res.json({ data: await auth.loginWithGoogle(req.valid.body.idToken, meta(req)) });
  });

  const RefreshBody = z.object({ refreshToken: z.string().min(10) });
  registry.registerPath({
    method: "post",
    path: "/auth/refresh",
    tags: ["Auth"],
    summary: "Exchange a refresh token for a new pair (rotation; reuse revokes the session)",
    request: { body: jsonBody(RefreshBody) },
    responses: { 200: json(envelope(Session)), 401: errors[401] },
  });
  router.post("/refresh", limiter, validate({ body: RefreshBody }), async (req, res) => {
    res.json({ data: await auth.refreshSession(req.valid.body.refreshToken, meta(req)) });
  });

  registry.registerPath({
    method: "post",
    path: "/auth/logout",
    tags: ["Auth"],
    summary: "Revoke the session of this refresh token",
    request: { body: jsonBody(RefreshBody) },
    responses: { 204: { description: "Signed out" } },
  });
  router.post("/logout", validate({ body: RefreshBody }), async (req, res) => {
    await auth.logout(req.valid.body.refreshToken);
    res.status(204).end();
  });

  registry.registerPath({
    method: "get",
    path: "/auth/me",
    tags: ["Auth"],
    summary: "Current user",
    security: [{ [bearerAuth.name]: [] }],
    responses: { 200: json(envelope(UserSchema)), 401: errors[401] },
  });
  router.get("/me", authenticate, async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user || !user.active) throw notFound("User");
    res.json({ data: user.toApi() });
  });

  return router;
}
