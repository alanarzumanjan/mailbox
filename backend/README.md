# EmptyLess — бэкенд

Бэкенд сети умных почтовых ящиков для Latvijas Pasts. Принимает показания датчиков
(вес + ИК-расстояние), определяет заполненность, поднимает тревоги, строит оптимальный
маршрут курьера только по полным ящикам и считает, сколько это экономит.

**Стек:** Node.js 22 · Express 5 · MongoDB (Mongoose 8) · Zod · JWT · OpenAPI 3.1 · Docker

```
Arduino ──USB──► serial-bridge ──HTTP + X-Device-Key──┐
ESP32 (серийная версия) ─────────HTTP + X-Device-Key──┤
                                                      ▼
                                   ┌──────────── EmptyLess API ────────────┐
                                   │ телеметрия → правила → события       │
                                   │ маршрут (Held-Karp) · аналитика      │
                                   │ пользователи/роли · аудит · монитор  │
                                   └──┬────────────┬──────────────┬───────┘
                                      ▼            ▼              ▼
                                   MongoDB    SSE-поток      Email / Webhook
                                              (дашборд)      (критические)
```

## Возможности

| Область | Что сделано |
|---|---|
| Телеметрия | Приём показаний, расчёт заполнения по двум датчикам, история с TTL |
| События | Генерация на **переходах** состояния: заполнен, низкий заряд, быстрое заполнение, датчик офлайн/онлайн |
| Маршрут | Точный TSP (Held-Karp) до 12 точек, nearest neighbour + 2-opt дальше |
| Аналитика | Экономия км/времени/топлива/€ против фиксированного графика, выемки по дням, история заполнения |
| Доступ | Роли admin/dispatcher/courier, JWT + ротация refresh-токенов с детектом кражи, вход через Google |
| Устройства | Ключ на каждый датчик (хранится хэш), выдача/ротация/отзыв, офлайн-монитор |
| Realtime | SSE-поток `box.updated` / `event.created` / `pickup.created` |
| Уведомления | Email (Resend) и webhook (Slack/Teams) на критические события |
| Эксплуатация | Swagger UI, JSON-логи с request-id, rate limiting, helmet, аудит-лог, healthcheck, graceful shutdown, CI |
| Железо | Мост USB-Serial → API для Arduino Uno без Wi-Fi |

## Быстрый старт

```bash
cp .env.example .env
docker compose up --build
```

- API — http://localhost:4000
- **Swagger UI — http://localhost:4000/docs** (там же можно авторизоваться и вызвать любой метод)
- OpenAPI — http://localhost:4000/openapi.json
- MongoDB — `mongodb://localhost:27017/emptyless`

При пустой базе API сам загружает демо-данные (те же 14 ящиков, районы, курьеры и события,
что на сайте), создаёт демо-пользователей и датчик для MG-001 и **печатает его ключ в лог**.

| Роль | Email | Пароль |
|---|---|---|
| admin | admin@emptyless.lv | admin-demo-2026 |
| dispatcher | dispatcher@emptyless.lv | dispatch-demo-2026 |
| courier (CR-01) | courier@emptyless.lv | courier-demo-2026 |

Демо-доступы существуют только в режиме разработки. В production сид не запускается,
пользователей создаёт админ через `POST /api/users`.

Пересоздать демо-данные: `docker compose exec api node src/seed/seed.js`.

Без Docker: `npm install`, запустить MongoDB, `npm run dev`.

## Подключение прототипа (Arduino)

У Arduino Uno нет Wi-Fi, поэтому показания передаёт компьютер, к которому он подключён:

```bash
cd tools/serial-bridge && npm install
node bridge.js --list                                   # найти порт
EMPTYLESS_DEVICE_KEY=eld_... node bridge.js --port /dev/ttyUSB0   # Windows: --port COM3
```

Мост понимает любой из форматов, которые печатает скетч:

```
{"weight":1850,"distance":120}        ← рекомендуемый
1850,120
Weight: 1850 g | Distance: 12 cm
```

Отправляет только заметные изменения (±10 г, ±5 мм) и раз в минуту «я жив»,
повторяет при обрыве сети. По ответу (`status`) можно переключать светодиод.
В серийной версии ESP32 шлёт тот же POST напрямую — API не меняется.

## Как считается заполненность

Берётся максимум из двух процентов:

- **по весу** `weight / maxWeightG` — видит даже одну открытку;
- **по объёму** `(emptyDistanceMm − distance) / (emptyDistanceMm − fullDistanceMm)` — срабатывает,
  когда лёгкие письма дошли до верха (ответ на вопрос «50 открыток весят мало, но забили ящик»).

Пороги как на фронте: `normal` < 75% ≤ `warning` < 100% ≤ `full`. Низкий заряд — ≤ 20%.
Калибровка расстояний настраивается для каждого ящика (`PATCH /api/boxes/:id`).

## Роли

| | courier | dispatcher | admin |
|---|:-:|:-:|:-:|
| Ящики, районы, события, курьеры, маршрут, SSE | ✓ | ✓ | ✓ |
| Выемка | только за себя | ✓ | ✓ |
| Свой статус и заметка | ✓ | ✓ | ✓ |
| KPI, аналитика, история показаний, назначение курьеров | | ✓ | ✓ |
| Ящики: создание/изменение/списание, датчики, пользователи, аудит | | | ✓ |

## API

Полная документация с примерами — в Swagger (`/docs`). Все ответы — `{ "data": ... }`,
списки с пагинацией добавляют `nextCursor`. Ошибки — `{ "error": { code, message, details? } }`.

| Метод | Путь | Роль |
|---|---|---|
| POST | `/api/auth/login` · `/google` · `/refresh` · `/logout` | — |
| GET | `/api/auth/me` | любая |
| GET/POST | `/api/users` · PATCH `/api/users/:id` | admin |
| GET | `/api/boxes?district&status&lowBattery&online` · `/api/boxes/:id` | любая |
| POST/PATCH/DELETE | `/api/boxes` · `/api/boxes/:id` | admin |
| GET | `/api/boxes/:id/readings` · `/api/boxes/:id/pickups` | dispatcher |
| POST | `/api/boxes/:id/pickups` | любая |
| POST | `/api/devices/readings` | **ключ устройства** |
| GET/POST | `/api/devices` · `/:id/rotate-key` · `/:id/revoke` | admin |
| POST | `/api/routes/optimize` | любая |
| GET | `/api/events?type&boxId&since&cursor` | любая |
| GET/PATCH | `/api/couriers` · `/api/couriers/:id` | любая* |
| GET | `/api/districts` | любая |
| GET | `/api/stats/overview` | dispatcher |
| GET | `/api/analytics/savings` · `/pickups` · `/fill-history` | dispatcher |
| GET | `/api/stream` | любая |
| GET | `/api/audit` | admin |
| POST | `/api/simulate/mail` | любая (если `ENABLE_SIMULATION`) |
| GET | `/health` · `/openapi.json` · `/docs` | — |

### Примеры

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

Цифры выше — на демо-данных (3 полных ящика из 14). Параметры модели (расход, цена топлива,
скорость, время на остановку) задаются в `.env`.

### Realtime

```js
const es = new EventSource(`${API}/api/stream?access_token=${accessToken}`);
es.addEventListener("box.updated", (e) => updateBox(JSON.parse(e.data)));
es.addEventListener("event.created", (e) => pushEvent(JSON.parse(e.data)));
```

## Подключение к фронту

| Сейчас во фронте | Заменить на |
|---|---|
| `INITIAL_BOXES` + `setBoxes` | `GET /api/boxes` + SSE `box.updated` |
| `INITIAL_EVENTS` + `pushEvent` | `GET /api/events` + SSE `event.created` |
| `COURIERS`, `SHIFT_STATS`, `DISTRICTS` | `/api/couriers`, `/api/stats/overview`, `/api/districts` |
| `.sort((a, b) => a.lng - b.lng)` в `CourierApp` | `POST /api/routes/optimize` |
| `handleCollect` | `POST /api/boxes/:id/pickups` |
| `handleSimulateMail` | `POST /api/simulate/mail` |
| `setInterval` со случайными данными | убрать |
| Поле `updated: "Just now"` | `updatedAt` (ISO), форматировать на клиенте |

## Безопасность

- Пароли — bcrypt; ключи датчиков и refresh-токены — только SHA-256 хэши в базе.
- Access-токен живёт 15 минут; refresh ротируется при каждом использовании, повторное
  предъявление старого токена отзывает всю сессию.
- Смена пароля, роли или отключение пользователя завершают все его сессии.
- Одинаковый ответ на «нет пользователя» и «неверный пароль» (с выравниванием по времени).
- Rate limiting: логин 20 попыток / 15 мин, датчик 60 / мин, API 600 / мин.
- Секреты вырезаются из логов и аудита; production не стартует без `JWT_SECRET`.
- Аудит-лог всех админ-действий: кто, что, когда, с какого IP.

## Тесты

```bash
npm run lint
npm test                                            # юнит-тесты (без базы)
TEST_MONGODB_URI=mongodb://localhost:27017 npm test # + интеграционные (51 тест)
npm run test:bridge                                 # парсер моста
```

Интеграционные тесты покрывают авторизацию и ротацию токенов, права ролей, ключи устройств,
правила событий, офлайн-монитор, выемки, маршрут, SSE, уведомления, пагинацию, аналитику,
формат ошибок и rate limiting. Оптимальность маршрута проверяется сравнением с полным перебором.
CI (`.github/workflows/backend.yml`) гоняет всё против MongoDB 7 и собирает Docker-образ.

## Структура

```
src/
  config.js        переменные окружения, валидация на старте
  app.js           сборка приложения (middleware, роуты)
  server.js        запуск, фоновый монитор, уведомления, graceful shutdown
  schemas.js       публичные схемы API (валидация + OpenAPI)
  domain/          чистая логика без БД: заполненность, гео, маршрут
  models/          Box, Reading, Event, Courier, Pickup, District, User, RefreshToken, Device, AuditLog
  services/        телеметрия, выемки, auth, устройства, монитор, уведомления, аналитика, аудит
  routes/          HTTP-слой
  middleware/      auth и роли, ключ устройства, валидация, лимиты, ошибки
  lib/             логгер, шина событий, OpenAPI, пагинация, крипто
  seed/            демо-данные
tools/serial-bridge/   мост Arduino → API
test/                  тесты
```

## Ограничения и следующие шаги

Сознательные упрощения, которые нужно закрыть перед реальным масштабом:

- **Несколько инстансов API.** Шина событий, SSE и rate limiting работают в памяти одного
  процесса. Для горизонтального масштабирования — MongoDB change streams или Redis.
- **Очередь уведомлений.** Письма и webhook уходят из процесса без ретраев; следующий шаг — BullMQ/SQS.
- **Расстояния по прямой.** Маршрут оптимизирует порядок по haversine; для точных км можно
  брать матрицу расстояний из OSRM `/table`.
- **Access-токен после отключения пользователя** действует до 15 минут (refresh отзывается сразу).
- **Связь в поле.** Прототип использует Wi-Fi/USB; для улиц Риги нужен NB-IoT или LoRaWAN —
  формат API от этого не меняется.
