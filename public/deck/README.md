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
| 1–9 | jump to a slide |
| F | fullscreen |
| T | switch light ↔ dark |
| N | voiceover text, planned time, step and a running clock |
| R | reset the clock (it starts on your first click) |
| E | highlight placeholders (TBD) |
| H | hide the key hint |

Recording: press F, N off, hide the cursor, record with OBS. The clock in N shows whether you're on time (planned time is per slide, `data-t`).

## Slides (follow Kira's pitch script, ≈5 min)
| # | Slide | On screen |
|---|---|---|
| 1 | Hook — the cost of collecting air | The courier van stuck in a queue of cars, brake lights, exhaust |
| 2 | Problem & risk | Map of Latvia with 547 postboxes (illustrative positions); click: 164 freestanding light up; last click: 83 removed boxes blink red and disappear |
| 3 | Solution | The sensor module assembles itself inside the postbox from points of light ("installing the module"), then letters start falling in; live readout; at 80% the LED blinks red and the box is "Flagged for collection" |
| 4 | Live demonstration | Split screen, the same 10 postboxes: left conventional route (all "?"), right EmptyLess route to the 3 full ones (30 → 12 blocks = −60%). Click 1: dispatcher video, click 2: courier video (`../alert-demo.mp4`, `../courier-demo.mp4`) |
| 5 | Business model | €65 module, €10.7k for 164 freestanding boxes, hardware + SaaS, payback measured in the pilot |
| 6 | Engineering | Module close-up with labelled parts (load cell + HX711, ToF, ESP32, 18650); click 1: exploded view, the labels follow the parts; click 2: back together |
| 7 | Team | Six people and roles |
| 8 | Pilot | Schematic map of Riga with the five pilot districts; what we will measure |
| 9 | Vision | Waste containers, textile and battery points join the postboxes; everything links to one hub |

Effects: headlines rise word by word; uplink beams with data packets over full boxes; dust in the air; glowing ground grid with a pulse ring (strong in the dark theme); full boxes blink; the map's postboxes rain down from above; the cursor hides itself after ~2 s for recording. Between the box close-up, the city and the map the picture dips to the background instead of flying. The camera drifts slightly all the time. Dark theme: glow on LEDs, routes and points, a soft vignette and grain (`?nofx` turns it off).

The prototype team adds their text to slide 3 (look for `[PROTOTYPE TEXT …]` in the notes).

## Authoring
In `index.html`:
- `data-st="2"` on an element: it appears on click 2 of the slide.
- `data-to="547"` (+ `data-pre`, `data-suf`, `data-dec`): the number counts up when it appears.
- `data-views="a,b"` on a section: camera view per step (views are in `js/scene.js → VIEWS`).
- `data-win="1"` on the USP table: the winning column lights up on click 1.
- `<aside class="notes">`: the voiceover; write `[click]` where the speaker advances.
After editing `index.html`, run `./make-dark.sh`.

## Numbers (from Kira's pitch script)
547 postboxes, 164 freestanding · 112 planned / 83 removed in 2025 · 20–25 km/h in city traffic · fuel ~€2/l · courier €11.87/h · ~2.7 kg CO₂ per litre · letter mail −25% in two years · module ~€65 in components, excl. VAT · 164 × €65 ≈ €10.7k · flagged at 80% · demo: 10 boxes, ~45 min, 3 full, route −60%.

## Placeholders (press E in the deck)
| Slide | What |
|---|---|
| 5 Business | SaaS subscription price |
| 8 Pilot | pilot duration (script says 4 weeks; parts and assembly come before that) |
| 3 Solution | prototype text from the prototype team (notes only) |

Team (slide 7): check the names and roles before recording.
Product name: `EmptyLess` (as in the site header). To rename, replace it in `index.html` and run `./make-dark.sh`.

## Structure
- `index.html`: slides; each `<section>` has `data-view` / `data-views` (3D camera per step) and `<aside class="notes">` (voiceover)
- `css/deck.css`: themes (CSS variables at the top), layout
- `js/scene.js`: core 3D — city, postbox with cutaway and letters, van, routes, point clouds, split-screen demo, glow pass
- `js/sets.js`: extra sets — traffic (Hook), map of Latvia (Problem), network of assets (Vision), Pilot background
- `js/deck.js`: navigation, click-steps, counters, videos, notes, theme switching
- `SCRIPT.md`: the whole voiceover in one file
