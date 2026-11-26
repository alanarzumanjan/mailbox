# EmptyLess — voiceover script (EN)

Target ≈ 5:00. `[click]` = press → (next step). In the deck press **N** to see this text, the planned time and a running clock (R resets the clock).

## 1. Hook — 0:00

Every working day, a Latvijas Pasts courier drives to a postbox, opens it — and finds it empty. [click] Nobody could know before the lock was open. So the van drives on, on the same fixed schedule, every day. [click] We built EmptyLess, so every postbox can tell you how full it is.

## 2. Problem — 0:25

Latvijas Pasts runs [click] 547 postboxes, all emptied on a fixed round. But [click] letters fell 14 percent in 2024 and another 13 percent this year. [click] In 2025, 83 boxes were removed — without data on how much mail each box gets. Meanwhile [click] parcels grow 17 percent — that's where courier time is needed. [click] And every empty stop still costs fuel, courier hours and CO₂.

## 3. Solution — 1:05

We create a fill sensor that fits into the postboxes Latvijas Pasts already has. It notices even one letter and reports it live — for dispatchers and couriers — so that couriers drive only to full boxes. Now every box on the map has a status. [click] The sensor feels the weight, reports only when something changes, and the route goes only to the red boxes.

## 4. Demo — 1:40

Here is our prototype. A letter drops in, the load cell feels the weight, the ESP32 sends weight and fill level to our backend — and once the box is full, its LED turns red. [click] The dispatcher sees it instantly: the box is full, and it's added to the next route. [click] The courier opens the app — and gets a route only to the boxes that are full.

## 5. USP — 2:20

The alternatives. Today, the courier finds out a box is empty only after opening it. A camera in the box needs light and power — and someone still has to look at the pictures, which are photos of people's mail. A new smart box knows when it's full, but it means replacing every box, at 1,500 euros or more. [click] EmptyLess goes into the boxes that already exist, the box itself reports when it's full — automatically — it sends only weight and fill level, and it costs 62 euros.

## 6. Business — 2:55

The business. [click] The kit costs 62 euros per box — ex VAT, from official shops. [click] Equipping all 547 boxes in Latvia costs about 34 thousand euros, once. [click] Our current projection is 77 thousand euros saved per year on 50 routes — the pilot will confirm the real number. [click] We sell the hardware at cost and earn on a platform licence per box. And every post with falling letter volume is our next market.

## 7. Validation — 3:35

What's validated? [click] A working prototype that sends live data from a real box to our backend, and dispatcher and courier apps that are online right now. [click] Our numbers come from the regulator and the statistics office. And our mentor's feedback — retrofit, don't replace — changed our design: the module now fits into the boxes that already exist.

## 8. Team — 4:00

We are six students from TSI in Riga, and together we cover the whole chain: the device, the backend and data, the apps, and the business case. In 48 hours we built a working box and a working platform.

## 9. Ask & plan — 4:15

Our ask: give us 30 postboxes on one mixed route in Riga, and six months. The hardware for the whole pilot costs under 1,900 euros. [click] In the first two months we order the parts, build and test 30 units. [click] In month three we install them on one route and connect them to the dashboard. [click] Then for three months demand-based routes run next to a control route — and we report the kilometres, fuel, hours and CO₂ saved. [click] From Latvijas Pasts we need access to the boxes, the route data, and one dispatcher to work with.

## 10. Vision — 4:45

Our vision: a postal network that knows itself. [click] Every postbox in Latvia reports its real demand. [click] Decisions about which boxes to keep or move are made on data, not guesses. [click] And courier hours move from empty boxes to growing parcels — with less fuel and less CO₂. [click] EmptyLess — never visit an empty postbox again. Thank you.
