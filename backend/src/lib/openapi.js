// Single source of truth: Zod schemas validate requests AND describe the API in Swagger.
// Routes register their paths via `registry.registerPath(...)`.
import { z } from "zod";
import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

export const bearerAuth = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});
export const deviceKeyAuth = registry.registerComponent("securitySchemes", "deviceKey", {
  type: "apiKey",
  in: "header",
  name: "X-Device-Key",
});

export const ErrorSchema = registry.register(
  "Error",
  z.object({
    error: z.object({
      code: z.string().openapi({ example: "not_found" }),
      message: z.string(),
      details: z.any().optional(),
    }),
  }),
);

// The { data: T } envelope used for every successful response.
export const envelope = (schema) => z.object({ data: schema });

const errorResponse = (description) => ({
  description,
  content: { "application/json": { schema: ErrorSchema } },
});

export const errors = {
  400: errorResponse("Validation error"),
  401: errorResponse("Not authenticated"),
  403: errorResponse("Not allowed for this role"),
  404: errorResponse("Not found"),
  409: errorResponse("Conflict"),
  422: errorResponse("Cannot be processed"),
  429: errorResponse("Too many requests"),
};

export const json = (schema, description = "OK") => ({
  description,
  content: { "application/json": { schema } },
});

export const jsonBody = (schema) => ({
  required: true,
  content: { "application/json": { schema } },
});

export function buildOpenApiDocument() {
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: "3.1.0",
    info: {
      title: "EmptyLess API",
      version: "1.0.0",
      description:
        "Smart postbox network for Latvijas Pasts: sensor telemetry, fill status, " +
        "alerts, courier pickups, route optimisation and analytics.",
    },
    servers: [{ url: "/" }],
    tags: [
      { name: "Auth" },
      { name: "Users" },
      { name: "Boxes" },
      { name: "Devices" },
      { name: "Telemetry" },
      { name: "Routing" },
      { name: "Dispatch" },
      { name: "Analytics" },
      { name: "Realtime" },
      { name: "System" },
    ],
  });
}
