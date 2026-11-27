import { Device } from "../models/Device.js";
import { Box } from "../models/Box.js";
import { HttpError, notFound } from "../middleware/errors.js";
import { randomToken, safeEqual, sha256 } from "../lib/crypto.js";

const KEY_RE = /^eld_([A-Za-z0-9_-]{10})_([A-Za-z0-9_-]{32,})$/;

function generateKey() {
  const prefix = randomToken(8).slice(0, 10).replace(/_/g, "x");
  return { prefix, key: `eld_${prefix}_${randomToken(32)}` };
}

async function nextDeviceId() {
  const ids = await Device.find({}, { _id: 1 }).lean();
  const max = ids.reduce((m, { _id }) => Math.max(m, Number(_id.slice(4)) || 0), 0);
  return `DEV-${String(max + 1).padStart(3, "0")}`;
}

/** Выдать новый датчик ящику. Возвращает ключ в открытом виде — единственный раз. */
export async function provisionDevice({ boxId, name, firmware }) {
  if (!(await Box.exists({ _id: boxId, active: true }))) throw notFound(`Box ${boxId}`);
  const { prefix, key } = generateKey();
  const device = await Device.create({
    _id: await nextDeviceId(),
    boxId,
    name,
    firmware,
    keyPrefix: prefix,
    keyHash: sha256(key),
  });
  return { device, apiKey: key };
}

/** Новый ключ взамен старого (старый перестаёт работать сразу). */
export async function rotateDeviceKey(deviceId) {
  const device = await Device.findById(deviceId);
  if (!device) throw notFound(`Device ${deviceId}`);
  if (device.status === "revoked") throw new HttpError(409, "conflict", "Device is revoked");
  const { prefix, key } = generateKey();
  device.keyPrefix = prefix;
  device.keyHash = sha256(key);
  await device.save();
  return { device, apiKey: key };
}

export async function revokeDevice(deviceId) {
  const device = await Device.findById(deviceId);
  if (!device) throw notFound(`Device ${deviceId}`);
  device.status = "revoked";
  device.revokedAt = new Date();
  await device.save();
  return device;
}

/** Найти активный датчик по ключу из заголовка. null — ключ неверный. */
export async function findDeviceByKey(key) {
  const match = KEY_RE.exec(key ?? "");
  if (!match) return null;
  const device = await Device.findOne({ keyPrefix: match[1], status: "active" }).select("+keyHash");
  if (!device || !safeEqual(device.keyHash, sha256(key))) return null;
  return device;
}
