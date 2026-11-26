# MailGrid — pitch deck (RobotHack '26)

Static HTML + three.js r128, no build step.

- In the project: `npm run dev` → http://localhost:3000/deck (light) and http://localhost:3000/deck/dark (dark). On Vercel the same paths, `/deck` and `/deck/dark` (redirects in `next.config.mjs`).
- Without a server or internet (best for recording): open `public/deck/index.html` or `dark.html` in Chrome.

- `index.html`: light version (white background, dark text)
- `dark.html`: dark version (#172033 background, white text). After editing `index.html`, run `./make-dark.sh`; `index.html?theme=dark` also works locally
- Accent in both: #0b9b70. Red (#e5484d) marks only the "box is full" status, the same as the LED on the real device.

## Controls
| Key | Action |
|---|---|
| → / ← / Space / PgDn | next / previous slide |
| 1–9, 0 | jump to slide |
| F | fullscreen |
| T | switch light ↔ dark |
| N | voiceover text under the slide |
| E | highlight placeholders (TBD) |

For video recording: press F, hide the cursor and record the screen (OBS). Each slide has its own camera angle, and the 3D scene animates continuously.

## Demo video
Put a screen recording of the device and dashboard at `assets/demo.mp4` (16:9). It appears automatically on slide 4 (Demo), in place of the right half of the 3D view.

## Where the numbers come from (known)
| Number | Source |
|---|---|
| 547 postboxes = 164 street + 383 integrated; 83 removed in 2025 (112 planned) | Alisa's research (Latvijas Pasts) |
| Letters 16.6 M in 2024, −14.2%; −13% H1 2025; ~25% over two years; parcels +17% | SPRK via ifinanses.lv (smartbox.xlsx) |
| Diesel €2.079/l (Oct 2026), van 6.6 l/100 km → €0.137/km | CSP via lvportals.lv, Spritmonitor (smartbox.xlsx) |
| €11.87/h gross: national average (Q1 2026), a proxy for a courier's rate | CSP (smartbox.xlsx) |
| CO₂ 2.6–3.25 kg per litre → 0.17–0.21 kg/km | Alisa's research |
| Kit €62.26 (weight + distance) / €49.55 (weight only), batch of 200, ex-VAT | smartbox.xlsx |
| 547 × €62.26 ≈ €34k; 547 × €49.55 ≈ €27k; pilot 30 × €62.26 = €1,868 | calculation |

## Placeholders — replace with real data (press E in the deck)
| Slide | What | Current value (from the PitchPage) |
|---|---|---|
| 6 Business | annual savings | €77k/yr, 107 t CO₂ on 50 routes, −30–40% fuel |
| 6 Business | serial price of the module | "lower with a bare ESP32 + own PCB" (no figure) |
| 6 Business | pricing tiers (Pilot / Full rollout) | from the website, no prices |
| 6 Business | market size outside Latvia | not stated |
| 7 Validation | feedback from Latvijas Pasts dispatchers / couriers | none yet |
| 9 Ask | pilot scope | 30 boxes, 8 weeks, week-by-week plan |

Team (slide 8): check the names and roles before recording.
Product name: `MailGrid`. It is in two places in `index.html` (search for `data-brand`) and in `<title>`.

## Structure
- `index.html`: slides; each `<section>` has `data-view` (3D camera angle) and `<aside class="notes">` (voiceover text)
- `css/deck.css`: themes (CSS variables at the top), layout
- `js/scene.js`: 3D city, postbox with a cutaway view, van, routes. `VIEWS` = camera angles
- `js/deck.js`: navigation, keys, theme switching
- `SCRIPT.md`: the whole voiceover text in one file
