# EmptyLess — backend

Backend for a network of smart postboxes for Latvijas Pasts. It ingests sensor readings
(weight + IR distance), works out how full each box is, raises alerts, plans the courier
route through full boxes only, and measures how much that saves.

**Stack:** Node.js 22 · Express 5 · MongoDB (Mongoose 8) · Zod · JWT · OpenAPI 3.1 · Docker

```
Arduino ──USB──► serial-bridge ──HTTP + X-Device-Key──┐
ESP32 (production unit) ─────────HTTP + X-Device-Key──┤
                                                      ▼
                                   ┌──────────── EmptyLess API ───────────┐
                                   │ telemetry → rules → events           │
                                   │ routing (Held-Karp) · analytics      │
                                   │ users/roles · audit · monitor        │
                                   └──┬────────────┬──────────────┬───────┘
                                      ▼            ▼              ▼
                                   MongoDB    SSE stream     Email / Webhook
                                              (dashboard)    (critical alerts)
```

## Features

| Area | What it does |
|---|---|
| Telemetry | Ingests readings, computes fill from two sensors, keeps history with a TTL |
| Events | Raised on **state transitions**: full, low battery, rapid fill, sensor offline/online |
| Routing | Exact TSP (Held-Karp) up to 12 stops, nearest neighbour + 2-opt beyond |
| Analytics | km/time/fuel/€ saved versus a fixed schedule, pickups per day, fill history |
| Access | admin/dispatcher/courier roles, JWT + rotating refresh tokens with theft detection, Google sign-in |
| Devices | One key per sensor (stored hashed), provisioning/rotation/revocation, offline monitor |
| Realtime | SSE stream: `box.updated` / `event.created` / `pickup.created` |
| Notifications | Email (Resend) and webhook (Slack/Teams) for critical events |
| Operations | Swagger UI, JSON logs with request ids, rate limiting, helmet, audit log, healthcheck, graceful shutdown, CI |
| Hardware | USB-Serial → API bridge for an Arduino Uno without Wi-Fi |

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

- API — http://localhost:4000
- **Swagger UI — http://localhost:4000/docs** (sign in and call any endpoint from there)
- OpenAPI — http://localhost:4000/openapi.json
- MongoDB — `mongodb://localhost:27017/emptyless`

With an empty database the API loads demo data (the same 14 boxes, districts, couriers and
events as the website), creates demo users and a sensor for MG-001, and **prints its key to the log**:

```bash
docker compose logs api | grep -A1 "Demo device"
```

| Role | Email | Password |
|---|---|---|
| admin | admin@emptyless.lv | admin-demo-2026 |
| dispatcher | dispatcher@emptyless.lv | dispatch-demo-2026 |
| courier (CR-01) | courier@emptyless.lv | courier-demo-2026 |

Demo accounts exist only in development. Production is never seeded; an admin creates
users via `POST /api/users`.

Recreate demo data: `docker compose exec api node src/seed/seed.js`.

Without Docker: `npm install`, start MongoDB, `npm run dev`.

## Connecting the prototype (Arduino)

An Arduino Uno has no Wi-Fi, so the computer it is plugged into forwards the readings:

```bash
cd tools/serial-bridge && npm install
node bridge.js --list                                              # find the port
EMPTYLESS_DEVICE_KEY=eld_... node bridge.js --port /dev/ttyACM0    # Windows: --port COM3
```

The bridge accepts any of these sketch output formats:

```
{"weight":1850,"distance":120}        ← recommended
1850,120
Weight: 1850 g | Distance: 12 cm
```

It sends only noticeable changes (±10 g, ±5 mm) plus an "I'm alive" every minute, and retries
when the network drops. The response `status` can drive the LED. In production an ESP32 makes
the same POST directly; the API does not change.

## How fill is calculated

The larger of two percentages wins:

- **by weight** `weight / maxWeightG` — notices even a single postcard;
- **by volume** `(emptyDistanceMm − distance) / (emptyDistanceMm − fullDistanceMm)` — triggers when
  light letters reach the top (the "50 postcards weigh little but fill the box" case).

Thresholds match the frontend: `normal` < 75% ≤ `warning` < 100% ≤ `full`. Low battery is ≤ 20%.
Distance calibration is per box (`PATCH /api/boxes/:id`).

## Roles

| | courier | dispatcher | admin |
|---|:-:|:-:|:-:|
| Boxes, districts, events, couriers, routing, SSE | ✓ | ✓ | ✓ |
| Pickup | own only | ✓ | ✓ |
| Own status and note | ✓ | ✓ | ✓ |
| KPIs, analytics, reading history, courier assignment | | ✓ | ✓ |
| Create/edit/decommission boxes, devices, users, audit | | | ✓ |

## API

Full reference with examples is in Swagger (`/docs`). Every response is `{ "data": ... }`;
paginated lists add `nextCursor`. Errors are `{ "error": { code, message, details? } }`.

| Method | Path | Role |
|---|---|---|
| POST | `/api/auth/login` · `/google` · `/refresh` · `/logout` | — |
| GET | `/api/auth/me` | any |
| GET/POST | `/api/users` · PATCH `/api/users/:id` | admin |
| GET | `/api/boxes?district&status&lowBattery&online` · `/api/boxes/:id` | any |
| POST/PATCH/DELETE | `/api/boxes` · `/api/boxes/:id` | admin |
| GET | `/api/boxes/:id/readings` · `/api/boxes/:id/pickups` | dispatcher |
| POST | `/api/boxes/:id/pickups` | any |
| POST | `/api/devices/readings` | **device key** |
| GET/POST | `/api/devices` · `/:id/rotate-key` · `/:id/revoke` | admin |
| POST | `/api/routes/optimize` | any |
| GET | `/api/events?type&boxId&since&cursor` | any |
| GET/PATCH | `/api/couriers` · `/api/couriers/:id` | any* |
| GET | `/api/districts` | any |
| GET | `/api/stats/overview` | dispatcher |
| GET | `/api/analytics/savings` · `/pickups` · `/fill-history` | dispatcher |
| GET | `/api/stream` | any |
| GET | `/api/audit` | admin |
| POST | `/api/simulate/mail` | any (if `ENABLE_SIMULATION`) |
| GET | `/health` · `/openapi.json` · `/docs` | — |

\* Couriers may update only their own status and note.

### Examples

```http
POST /api/devices/readings
X-Device-Key: eld_xxxxxxxxxx_...
{ "weight": 1850, "distance": 120, "battery": 86 }

→ 201 { "data": { "boxId": "MG-001", "status": "full", "fillPercent": 100, "trigger": "volume", "events": 1 } }
```

```http
GET /api/analytics/savings?runsPerDay=1
Authorization: Bearer <token>

→ { "data": {
     "fixedSchedule": { "stops": 14, "distanceKm": 29.9, "durationMin": 114, "fuelCostEur": 4.3 },
     "smartRoute":    { "stops": 3,  "distanceKm": 12.5, "durationMin": 39,  "fuelCostEur": 1.8 },
     "saved":         { "distanceKm": 17.4, "durationMin": 75, "percent": 58, "stopsSkipped": 11 },
     "projectedYearly": { "distanceKm": 6351, "hours": 456, "fuelCostEur": 913 } } }
```

These figures come from the demo data (3 of 14 boxes full). Model parameters (fuel use,
fuel price, speed, minutes per stop) are set in `.env`.

### Realtime

```js
const es = new EventSource(`${API}/api/stream?access_token=${accessToken}`);
es.addEventListener("box.updated", (e) => updateBox(JSON.parse(e.data)));
es.addEventListener("event.created", (e) => pushEvent(JSON.parse(e.data)));
```

## Frontend integration

| Frontend today | Replace with |
|---|---|
| `INITIAL_BOXES` + `setBoxes` | `GET /api/boxes` + SSE `box.updated` |
| `INITIAL_EVENTS` + `pushEvent` | `GET /api/events` + SSE `event.created` |
| `COURIERS`, `SHIFT_STATS`, `DISTRICTS` | `/api/couriers`, `/api/stats/overview`, `/api/districts` |
| `.sort((a, b) => a.lng - b.lng)` in `CourierApp` | `POST /api/routes/optimize` |
| `handleCollect` | `POST /api/boxes/:id/pickups` |
| `handleSimulateMail` | `POST /api/simulate/mail` |
| `setInterval` with random data | remove |
| `updated: "Just now"` field | `updatedAt` (ISO), format on the client |

## Security

- Passwords use bcrypt; device keys and refresh tokens are stored only as SHA-256 hashes.
- Access tokens live 15 minutes; refresh tokens rotate on every use, and replaying an old one
  revokes the whole session.
- Changing a password or role, or disabling a user, ends all their sessions.
- "No such user" and "wrong password" return identical responses (with timing equalised).
- Rate limits: login 20 attempts / 15 min, device 60 / min, API 600 / min.
- Secrets are redacted from logs and the audit trail; production refuses to start without `JWT_SECRET`.
- Every admin action is audited: who, what, when, from which IP.

## Tests

```bash
npm run lint
npm test                                            # unit tests (no database)
TEST_MONGODB_URI=mongodb://localhost:27017 npm test # + integration tests (51 tests)
npm run test:bridge                                 # bridge parser
```

Integration tests cover authentication and token rotation, role permissions, device keys,
event rules, the offline monitor, pickups, routing, SSE, notifications, pagination, analytics,
the error format and rate limiting. Route optimality is checked against brute force.
CI (`.github/workflows/backend.yml`) runs everything against MongoDB 7 and builds the Docker image.

## Layout

```
src/
  config.js        environment variables, validated at startup
  app.js           app assembly (middleware, routes)
  server.js        startup, background monitor, notifications, graceful shutdown
  schemas.js       public API schemas (validation + OpenAPI)
  domain/          pure logic without the database: fill, geo, routing
  models/          Box, Reading, Event, Courier, Pickup, District, User, RefreshToken, Device, AuditLog
  services/        telemetry, pickups, auth, devices, monitor, notifications, analytics, audit
  routes/          HTTP layer
  middleware/      auth and roles, device key, validation, limits, errors
  lib/             logger, event bus, OpenAPI, pagination, crypto
  seed/            demo data
tools/serial-bridge/   Arduino → API bridge
test/                  tests
```

## Limitations and next steps

Deliberate simplifications to address before running at real scale:

- **Multiple API instances.** The event bus, SSE and rate limiting live in one process's memory.
  Horizontal scaling needs MongoDB change streams or Redis.
- **Notification queue.** Emails and webhooks are sent in-process without retries; next step is BullMQ/SQS.
- **Straight-line distances.** Routing optimises order by haversine; exact km could come from
  the OSRM `/table` distance matrix.
- **Access token after a user is disabled** stays valid for up to 15 minutes (refresh is revoked immediately).
- **Connectivity in the field.** The prototype uses Wi-Fi/USB; Riga streets need NB-IoT or LoRaWAN.
  The API format does not change.
