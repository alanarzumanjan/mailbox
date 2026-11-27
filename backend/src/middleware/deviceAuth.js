// Авторизация датчика по заголовку X-Device-Key (ключ на каждое устройство).
// OAuth тут не подходит: ESP32/Arduino не умеет логиниться через Google.
import { HttpError } from "./errors.js";
import { findDeviceByKey } from "../services/devices.js";

export async function deviceAuth(req, res, next) {
  const device = await findDeviceByKey(req.get("x-device-key"));
  if (!device) throw new HttpError(401, "unauthorized", "Missing, invalid or revoked X-Device-Key");
  req.device = device;
  next();
}
