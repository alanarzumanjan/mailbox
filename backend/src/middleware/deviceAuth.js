// Device authentication via the X-Device-Key header (one key per device).
// OAuth does not fit here: an ESP32/Arduino cannot sign in with Google.
import { HttpError } from "./errors.js";
import { findDeviceByKey } from "../services/devices.js";

export async function deviceAuth(req, res, next) {
  const device = await findDeviceByKey(req.get("x-device-key"));
  if (!device) throw new HttpError(401, "unauthorized", "Missing, invalid or revoked X-Device-Key");
  req.device = device;
  next();
}
