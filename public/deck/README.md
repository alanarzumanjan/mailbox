# EmptyLess — pitch deck (RobotHack '26)

Static HTML + three.js r128, no build step.

- In the project: `npm run dev` → http://localhost:3000/deck (light) and http://localhost:3000/deck/dark (dark). On Vercel the same paths, `/deck` and `/deck/dark` (redirects in `next.config.mjs`).
- Without a server or internet (best for recording): open `public/deck/index.html` or `dark.html` in Chrome.

- `index.html`: light version (white background, dark text)
- `dark.html`: dark version (#172033 background, white text). After editing `index.html`, run `./make-dark.sh`; `index.html?theme=dark` also works locally
- Accent in both: #0b9b70. Red (#e5484d) marks only the "box is full" status, the same as the LED on the real device.

## Controls
| Key | Action |
|---|---|
| → / Space / Enter / PgDn / click | next **step** (items on a slide appear one by one), then the next slide |
| ← / Backspace / PgUp | back one step |
| 1–9, 0 | jump to a slide |
| F | fullscreen |
| T | switch light ↔ dark |
| N | voiceover text, planned time, step and a running clock |
| R | reset the clock (it starts on your first click) |
| E | highlight placeholders (TBD) |
| H | hide the key hint |

Recording: press F, N off, hide the cursor, record with OBS. The clock in N shows whether you're on time (planned time is per slide, `data-t`).

## What happens on screen
- **Hook:** the postbox assembles from 16,000 points of light, then becomes the real model.
- **Problem:** the van drives to every box; boxes show "Full? Empty?". Numbers count up click by click.
- **Solution:** step 0 — boxes show their fill level and signal rings; step 1 — the route goes only to the red ones.
- **Demo:** the box in cutaway, letters falling on the scale, live readout. Click 1 — dispatcher alerts video, click 2 — courier app video (`../alert-demo.mp4`, `../courier-demo.mp4` from the site's `public/`).
- **USP:** click — the EmptyLess column wins, the others fade.
- **Vision:** a giant postbox of light over the city.
- Between the box close-up and the city the picture dips to the background instead of flying through the houses. The camera drifts slightly all the time so the frame never freezes.
- Dark theme: glow on LEDs, routes and points, a soft vignette and a little grain. `?nofx` turns that off if a weak laptop stutters.

## Authoring
In `index.html`:
- `data-st="2"` on an element: it appears on click 2 of the slide.
- `data-to="547"` (+ `data-pre`, `data-suf`, `data-dec`): the number counts up when it appears.
- `data-views="a,b"` on a section: camera view per step (views are in `js/scene.js → VIEWS`).
- `data-win="1"` on the USP table: the winning column lights up on click 1.
- `<aside class="notes">`: the voiceover; write `[click]` where the speaker advances.
After editing `index.html`, run `./make-dark.sh`.

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
| Slide | What | Current value |
|---|---|---|
| 5 USP | price of a new smart box | €1,500–2,500 (from PitchPage) |
| 6 Business | annual savings | €77k/yr, 107 t CO₂ on 50 routes (from the first PitchPage) |
| 6 Business | platform licence | €4 / box / month (from PitchPage) |
| 7 Validation | feedback from Latvijas Pasts dispatchers | none yet |
| 9 Ask | pilot scope | 30 boxes, 6 months: build 1–2, install 3, run & report 4–6 |

Team (slide 8): check the names and roles before recording.
Product name: `EmptyLess` (as in the site header). To rename, replace it in `index.html` and run `./make-dark.sh`.

## Structure
- `index.html`: slides; each `<section>` has `data-view` (3D camera angle) and `<aside class="notes">` (voiceover text)
- `css/deck.css`: themes (CSS variables at the top), layout
- `js/scene.js`: 3D city, postbox with a cutaway view, van, routes. `VIEWS` = camera angles
- `js/deck.js`: navigation, keys, theme switching
- `SCRIPT.md`: the whole voiceover text in one file
