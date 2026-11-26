# MailGrid — voiceover script (EN)

Target: ~5 min. Text is also in the deck: press **N** to show it under each slide.

## 1. Hook

Every working day a Latvijas Pasts courier drives to a postbox, opens it — and finds nothing. There was no way to know before opening the lock. So the van drives on to the next one, on the same fixed schedule, tomorrow and the day after. We built MailGrid so that every postbox can tell you how full it is.

## 2. Problem

Latvijas Pasts runs 547 postboxes — 164 on the street and 383 integrated. They are emptied on a fixed round. But letters are falling fast: minus 14.2 percent in 2024, minus 13 percent again in the first half of 2025 — a quarter fewer in two years. In 2025 Latvijas Pasts removed 83 boxes — without data on how much mail each box actually gets. Meanwhile parcels grow 17 percent. Every empty stop still costs fuel, courier time and CO₂. That time could go where the volume is growing.

## 3. Solution

Our solution in one sentence: we create a fill sensor that retrofits into the postboxes Latvijas Pasts already has; it notices even a single letter and reports it live; for dispatchers and couriers; so blind schedules become pickups on real demand. It works in three steps: sense, report, route. On the map, only the red boxes need a pickup — and the route goes only there.

## 4. Demo

Here is the prototype. A letter drops in, the load cell feels the weight change, and the ESP32 sends weight, distance and battery level to our backend. Once the box passes the threshold, its LED turns red and the box turns red on the dispatcher's map — and it is added to today's pickup route. [Cut to the live dashboard and the real device here.]

## 5. USP

What are the alternatives? Keep the fixed schedule — cheap, but blind. Put a camera into the box — it needs light and power, and it photographs people's mail. Replace the boxes with new smart ones — the most expensive option. MailGrid is a retrofit: it goes into the boxes that already stand on the street, it only measures grams and percent, the hardware costs 50 to 62 euros per box today, and route planning is built in.

## 6. Business

The business is simple. The hardware kit costs 62 euros per box at prototype prices — ex VAT, from official shops, in a batch of 200 — or 50 euros without the distance sensor. Equipping all 547 boxes in Latvia costs about 34 thousand euros. On the side of savings, our current projection is [77 thousand euros and 107 tonnes of CO₂ per year on 50 routes] — the pilot will confirm the exact number. We earn on the hardware plus a yearly platform licence per box. And every postal operator with falling letter volume has the same problem.

## 7. Validation

What have we validated? We have a working prototype — load cell, distance sensor, ESP32 and an LED — that sends live data to our backend, and a dispatcher dashboard that is online right now. Every component is priced from official shops. Our numbers come from the regulator and the national statistics office. And the most important feedback from our mentor — retrofit, don't replace — changed our design: the module now fits into the boxes that already exist.

## 8. Team

We are six students from TSI in Riga, and between us we cover the whole chain: the device itself, the backend and data, the dashboard, and the business case. In 48 hours we built a working box and a working platform.

## 9. Ask & plan

Our ask is concrete. Give us 30 postboxes on one mixed route — Riga centre plus a suburb — and eight weeks. The hardware for the whole pilot costs under 1,900 euros. Weeks one and two: install and connect. Weeks three to six: collect real data and run demand-based routes next to a control route. Weeks seven and eight: a report with kilometres, fuel, hours and CO₂ saved — and data on which boxes to keep or move. From Latvijas Pasts we need access to the boxes, the current route data, and one dispatcher to work with.

## 10. Vision

Our vision: a postal network that knows itself. Every postbox in Latvia reports its real demand every day. Decisions about which boxes to keep, move or add are made on data. Courier hours move from empty boxes to the parcels that keep growing. And every route burns less fuel and less CO₂. MailGrid — never visit an empty postbox again. Thank you.
