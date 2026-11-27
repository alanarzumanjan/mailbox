// Единый формат ошибок: { error: { code, message, details? } }.
// Express 5 сам передаёт сюда ошибки из async-обработчиков, try/catch не нужен.
import mongoose from "mongoose";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const notFound = (what) => new HttpError(404, "not_found", `${what} not found`);

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: "not_found", message: `No route ${req.method} ${req.path}` } });
}


export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details && { details: err.details }) },
    });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: "validation_error", message: "Invalid request", details: err.flatten() },
    });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      error: { code: "validation_error", message: err.message },
    });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: { code: "validation_error", message: `Invalid ${err.path}` } });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ error: { code: "conflict", message: "Already exists" } });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: { code: "bad_json", message: "Malformed JSON body" } });
  }

  // req.log — логгер запроса из pino-http (с request id)
  (req.log ?? console).error({ err }, "unhandled error");
  res.status(500).json({ error: { code: "internal", message: "Internal server error" } });
}
