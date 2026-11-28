#!/usr/bin/env node
// Arduino (USB Serial) → EmptyLess API bridge.
//
// An Arduino Uno has no Wi-Fi, so readings go through the computer it is
// connected to. In the production device this is replaced by an ESP32 making
// a direct HTTP POST; the API contract is the same.
//
//   EMPTYLESS_DEVICE_KEY=eld_... node bridge.js --port /dev/ttyUSB0
//   node bridge.js --list            — list available ports
//   node bridge.js --dry-run ...     — print only, send nothing
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import { parseArgs } from "node:util";
import { parseLine, shouldSend } from "./parse.js";

const { values: args } = parseArgs({
  options: {
    port: { type: "string" },
    baud: { type: "string", default: "9600" },
    api: { type: "string", default: process.env.EMPTYLESS_API_URL ?? "http://localhost:4000" },
    key: { type: "string", default: process.env.EMPTYLESS_DEVICE_KEY },
    "min-weight-delta": { type: "string", default: "10" },
    "max-silence": { type: "string", default: "60" },
    list: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
  },
});

const log = (...m) => console.log(new Date().toISOString().slice(11, 19), ...m);

if (args.list) {
  const ports = await SerialPort.list();
  for (const p of ports) console.log(`${p.path}\t${p.manufacturer ?? ""}`);
  if (ports.length === 0) console.log("No serial ports found. Is the Arduino plugged in?");
  process.exit(0);
}

if (!args.port) {
  console.error("Missing --port (see --list)");
  process.exit(1);
}
if (!args.key && !args["dry-run"]) {
  console.error("Missing device key: set EMPTYLESS_DEVICE_KEY or pass --key");
  process.exit(1);
}

const thresholds = {
  minWeightDeltaG: Number(args["min-weight-delta"]),
  maxSilenceMs: Number(args["max-silence"]) * 1000,
};

let last = null; // last sent { reading, at }
let pending = null; // latest unsent reading (after a network failure)
let backoffMs = 0;

async function send(reading) {
  if (args["dry-run"]) {
    log("dry-run", reading);
    return true;
  }
  try {
    const res = await fetch(`${args.api}/devices/readings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-Key": args.key },
      body: JSON.stringify(reading),
      signal: AbortSignal.timeout(5000),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) {
      console.error("API rejected the device key (401). Check EMPTYLESS_DEVICE_KEY.");
      process.exit(2);
    }
    if (!res.ok) throw new Error(`${res.status} ${body.error?.message ?? ""}`);
    log(`sent ${reading.weight} g / ${reading.distance ?? "-"} mm → ${body.data.status} ${body.data.fillPercent}%`);
    return true;
  } catch (err) {
    log("send failed:", err.message);
    return false;
  }
}

async function handle(reading) {
  if (!shouldSend(last, reading, thresholds)) return;
  if (await send(reading)) {
    last = { reading, at: Date.now() };
    pending = null;
    backoffMs = 0;
  } else {
    // Keep only the latest: older readings are no longer relevant.
    pending = reading;
    backoffMs = Math.min(backoffMs ? backoffMs * 2 : 2000, 60_000);
    setTimeout(() => pending && handle(pending), backoffMs).unref();
  }
}

const port = new SerialPort({ path: args.port, baudRate: Number(args.baud) });
const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

port.on("open", () => log(`listening on ${args.port} @ ${args.baud} → ${args.api}`));
port.on("error", (err) => {
  console.error("Serial error:", err.message);
  process.exit(1);
});
port.on("close", () => {
  log("serial port closed (Arduino unplugged?)");
  process.exit(1);
});

parser.on("data", (line) => {
  const reading = parseLine(line);
  if (!reading) {
    if (line.trim()) log("skip:", line.trim().slice(0, 80));
    return;
  }
  void handle(reading);
});

// Even without changes, send an "I'm alive" every max-silence, otherwise
// the backend will mark the sensor offline.
setInterval(() => last && handle(last.reading), thresholds.maxSilenceMs).unref();

process.on("SIGINT", () => {
  log("bye");
  port.close();
  process.exit(0);
});
