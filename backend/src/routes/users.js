// User management (admin only).
import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { authenticate, ROLE } from "../middleware/auth.js";
import { HttpError, notFound } from "../middleware/errors.js";
import { registry, envelope, errors, json, jsonBody, bearerAuth } from "../lib/openapi.js";
import { UserSchema, ROLES, COURIER_ID, OBJECT_ID } from "../schemas.js";
import { User } from "../models/User.js";
import { Courier } from "../models/Courier.js";
import { hashPassword, revokeAllSessions } from "../services/auth.js";
import { audit } from "../services/audit.js";

const router = Router();
router.use(authenticate, ROLE.admin);

const security = [{ [bearerAuth.name]: [] }];
const Params = z.object({ id: OBJECT_ID });

// Password: at least 10 characters, a sensible minimum without "complexity for its own sake".
const Password = z.string().min(10).max(200);

async function assertCourierLink(role, courierId) {
  if (role === "courier" && !courierId) {
    throw new HttpError(400, "validation_error", "Courier users need courierId");
  }
  if (courierId && !(await Courier.exists({ _id: courierId }))) throw notFound(`Courier ${courierId}`);
}

registry.registerPath({
  method: "get",
  path: "/users",
  tags: ["Users"],
  summary: "List users (admin)",
  security,
  responses: { 200: json(envelope(z.array(UserSchema))), 401: errors[401], 403: errors[403] },
});
router.get("/", async (req, res) => {
  const users = await User.find().sort({ role: 1, email: 1 });
  res.json({ data: users.map((u) => u.toApi()) });
});

const CreateUser = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).max(120),
  role: z.enum(ROLES),
  password: Password.optional().openapi({ description: "Omit for Google-only accounts" }),
  courierId: COURIER_ID.optional(),
  notifyEmail: z.boolean().default(false),
});
registry.registerPath({
  method: "post",
  path: "/users",
  tags: ["Users"],
  summary: "Create a user (admin)",
  security,
  request: { body: jsonBody(CreateUser) },
  responses: { 201: json(envelope(UserSchema), "Created"), 400: errors[400], 409: errors[409] },
});
router.post("/", validate({ body: CreateUser }), async (req, res) => {
  const { password, ...data } = req.valid.body;
  await assertCourierLink(data.role, data.courierId);
  const user = await User.create({
    ...data,
    passwordHash: password ? await hashPassword(password) : null,
  });
  await audit(req, "user.create", "user", user._id, { ...data });
  res.status(201).json({ data: user.toApi() });
});

const UpdateUser = z
  .object({
    name: z.string().trim().min(1).max(120),
    role: z.enum(ROLES),
    password: Password,
    courierId: COURIER_ID.nullable(),
    notifyEmail: z.boolean(),
    active: z.boolean(),
  })
  .partial()
  .refine((b) => Object.keys(b).length > 0, { message: "Empty update" });
registry.registerPath({
  method: "patch",
  path: "/users/{id}",
  tags: ["Users"],
  summary: "Update a user; disabling or changing the password signs them out everywhere (admin)",
  security,
  request: { params: Params, body: jsonBody(UpdateUser) },
  responses: { 200: json(envelope(UserSchema)), 400: errors[400], 404: errors[404] },
});
router.patch("/:id", validate({ params: Params, body: UpdateUser }), async (req, res) => {
  const user = await User.findById(req.valid.params.id);
  if (!user) throw notFound("User");

  const { password, ...changes } = req.valid.body;
  if (user._id.toString() === req.user.id && (changes.active === false || (changes.role && changes.role !== "admin"))) {
    throw new HttpError(409, "conflict", "You cannot disable or demote yourself");
  }

  Object.assign(user, changes);
  await assertCourierLink(user.role, user.courierId);
  if (password) user.passwordHash = await hashPassword(password);
  await user.save();

  if (password || changes.active === false || changes.role) await revokeAllSessions(user._id);
  await audit(req, "user.update", "user", user._id, { ...changes, ...(password && { password: true }) });
  res.json({ data: user.toApi() });
});

export default router;
