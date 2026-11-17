# METROPOLIS – development progress

Version 0.9.0 · last updated 17 Nov 2026 · ~4,300 dense lines of JavaScript/CSS in 26 modules, no dependencies.

This file is the hand-over document. Read it first when continuing in a new session.

## Status in one paragraph

All six phases of the brief have a working implementation in breadth: you can start from empty land, lay
roads, zone, connect utilities, provide services, manage a budget, and grow a village into a city with
apartment blocks and towers, with saving and loading. Everything listed under "Implemented" is real
simulation, not placeholder numbers. What is **not** yet proven is depth at the far end: the automated
"mayor" bots only reach about 8,500 residents, so Major City / Metropolis / Megacity play and their balance
are untested in practice. See "Known gaps" and "Not verified".

## How to run and test

* Play: open `index.html` (works from `file://`), or serve the folder from any static host.
* `node test/sim-test.js [years]` – builds a scripted town and runs it for N years; checks growth, budget,
  NaN-free maps, cohort consistency, save/load round trip, undo, all four disasters.
* `node test/mechanics-test.js` – 57 focused assertions on individual mechanics.
* `python3 test/ui-test.py` – drives the real interface in headless Chrome (42 checks, reports JS errors).
* `python3 test/browser-test.py` – plays a city in headless Chrome and writes screenshots.

The two Python tests need Playwright and a Chrome binary (path is at the top of each file).

Last run of all four: all passing, 0 JavaScript errors.

## Implemented and verified by tests

| Area | What exists | Verified by |
| --- | --- | --- |
| Terrain | Seeded generation: sea on one edge or islands, river, lakes, beaches, 4 elevation levels, forests, rocks, flowers. Sizes 64–160. City limits that can be extended for money | sim-test, mechanics 3 |
| Roads | 7 types incl. one-way, highway, pedestrian path; automatic intersections, bridges (5× cost), drag to build/upgrade, traffic lights on avenues/boulevards | mechanics 1 |
| Pathfinding | A* on the road grid with congestion, signals, one-way rules, truck bans; connected-component cache | mechanics 1, 7 |
| Zoning | R/C/I × 3 densities, 5 building levels each, automatic spawn/upgrade, merge to 2×2 lots, abandonment and recovery | sim-test, mechanics 3 |
| Population | Cohorts (children/adults/seniors), births, deaths, ageing, migration, households, education levels, employment with skilled/unskilled matching, income, poverty, health | sim-test (cohorts always equal the sum of building residents) |
| Happiness | 12 weighted factors per home; complaints derived from the worst ones | mechanics 4 |
| Demand | R/C/I demand from jobs, purchasing power, unemployment, vacancy, taxes, happiness | sim-test, mechanics 4 |
| Economy | Taxes per zone, district tax offsets, upkeep, department budgets 50–120 %, three loan sizes, early repayment, business cycle with recessions, bailout then bankruptcy, 20 years of history | mechanics 4 |
| Electricity | Coal, gas, wind (weather-dependent), solar (weather-dependent), nuclear; roads and power lines conduct; 3-tile reach; brownouts with service priority | mechanics 2 |
| Water | Pumps (need water nearby, hurt by pollution), towers, treatment plant; shortages | mechanics 2 |
| Sewage & garbage | Sewage plants vs water pollution; landfills that fill up, recycling centres; garbage piles up per building | sim-test, mechanics 5 |
| Services | Fire, police, clinic, hospital, elementary, high school, university, library, cemetery; coverage maps, capacities, upgrades (3 levels), budgets | mechanics 5 |
| Environment | Air, ground, noise and water pollution, crime, land value (0–100), all as per-tile maps | mechanics 5 |
| Traffic | Trip assignment home→work, home→shop, freight; congestion feeds back into routes, commute times, noise and air pollution | mechanics 7 |
| Buses | Depots, stops, automatic routes, ridership, crowding, fares, free-transit policy | mechanics 7 |
| Disasters | Building fires with fire engines that drive the real road network, spread, rubble; storm, flood, earthquake, firestorm; repairs cost money; can be disabled | mechanics 6, sim-test |
| Districts & policies | 8 paintable, nameable districts with local tax; 12 policies city-wide or per district | mechanics 5, ui-test |
| Progression | 7 city ranks with unlocks and grants, per-rank objectives with hints, 19 achievements, 3 scenarios + free play, sandbox, 3 difficulties | mechanics 8 |
| Construction | Preview with valid/invalid tiles and reason, coverage ring, rotate (2 orientations), bulldoze, de-zone, upgrade, undo (30 steps) | mechanics 1, ui-test |
| Rendering | Cached 16×16 terrain chunks with LOD, screen-sized ground cache while the camera rests, depth-sorted sprites (large buildings split into strips), day/night with lit windows and street lights, rain/fog/storm/cloud shadows, smoke, fire, animated turbines and fountains, vehicles, pedestrians, 17 data overlays, minimap | browser-test screenshots, sprite sheet of all 900 variants |
| Interface | Animated main menu, new game form, pause menu, options, save/load slots, HUD, toolbar with thumbnails, 8 information panels, inspector for buildings and tiles, toasts, banners, tooltips, keyboard shortcuts, phone layout | ui-test (42 checks) |
| Saving | IndexedDB slots with names and metadata, quick save, autosave, falls back to memory when storage is blocked; settings and career achievements in localStorage | ui-test (survives page reload), browser-test |

## 0.9.0 – evening lighting, slopes, vehicle fixes

* **Lighting**: street lamp posts along straight roads (lit only where there is power) with warm light pools; window
  glow baked into each building's night sprite (no runtime cost: night renders as fast as day); per-building light
  sources (`Art.light`, `Art.post`): porch and shop lights, car-park lamps, park lamps, fountain lights, stadium and
  sports-field floodlights, blinking red aviation lights on anything taller than ~125 px; headlight beams and red tail
  lights; golden hour (soft-light warm), violet blue hour, and a saturated multiply-based night grade (ground and
  sprites use the same night colour) with extra contrast.
* **Terrain**: one-level steps are no longer vertical walls. The lower tile draws a sloping bank (grass, rock, or a
  sandy beach into the water with a wet line and surf at its foot); banks join along a terrace and round off outer
  corners; where a road climbs a step it becomes a ramp with pavement, asphalt and markings. Map edges keep walls.
* **Vehicles**: sprites for all four driving directions (cab, bonnet and windscreen at the front), so nothing drives
  backwards; at most ~1 in 8 visible vehicles is a truck.
* **UI fix**: panels no longer re-render during a click (a refresh between press and release used to swallow the click).

## 0.8.0 – traffic, weather and graphics overhaul

* **Traffic** (`js/traffic.js`, visible agents): right-hand lanes; each car follows a quadratic Bézier through its tile, so
  turns are smooth; cars keep their distance (lane index rebuilt every frame), accelerate and brake, stop at a stop
  line for red lights, and give way at junctions (one entry direction holds a junction; on signalled junctions the
  green axis may enter from both sides). Deadlocks resolve by letting a car stuck for 7 s pass. Cars fade in and out
  instead of popping. Buses stop at their stops. Visual time runs at most 2× however fast the simulation runs, and
  the number of cars is about a third of before (95 / 60 / 30 by quality). Measured: no overlapping cars.
* **Weather** (`Env.weatherTick`): runs on real time (showers last about 1–2 minutes, clear spells 2–4), follows
  sensible sequences (clear → cloudy → rain → cloudy), and rain, fog and cloud intensity fade in and out over ~8 s.
  The simulation still reads `weather.type` and `weather.wind`.
* **Sound**: rain is a soft low-passed hiss at a quarter of the old level, following the rain intensity; thunder only
  follows a visible lightning flash and is much quieter; the city hum is lower.
* **Day/night** runs on real time too (a full day ≈ 5–7 minutes) instead of racing at 4×.
* **Graphics**: all sprites are drawn at 2× resolution (1.5× medium, 1× low) and terrain at 2× when zoomed in, so the
  city stays sharp; walls have contact shadows and a light-to-dark gradient; windows reflect the sky; buildings cast
  shadows whose length follows the time of day; grass, sand and water colours vary smoothly instead of in a checkerboard;
  animated surf along the shore; golden-hour grade, softer rain with splashes, a vignette.
* Deploy: `wrangler.jsonc` + `.assetsignore` (tests and docs are not served).

## Tutorial (added in 0.7.0)

`js/tutorial.js` – 14 guided steps (camera, road, homes, power, water, time, jobs, demand bars, inspector,
budget, data views). Each step watches the real game state and advances by itself; a pulsing ring marks the
UI element and a glowing rectangle marks the suggested spot on the map, fitted into the free part of the
screen (also on phones). Start it from the main menu (**Tutorial**, fixed seed 4242, easy, no disasters), the
New Game form (checked until you finish it once) or the pause menu (**Start/Resume Tutorial**). Progress is
stored in the save; random disasters are suspended while it runs. To add a step, append to `T.STEPS`
(`target` selector, optional `map` rectangle, `done()` check or `info: true`).

Tests: `python3 test/tutorial-test.py [outdir] [w h]` plays it like a new player (only clicking the highlighted
element, dragging over the highlighted area) – passes at 1366×768 and 390×844 in ~30 s of real time.
`python3 test/tutorial-edge-test.py` – close, back, resume from pause menu, save/load mid-tutorial (11 checks).

## Usability play-test findings and fixes (0.7.0)

| Found by playing | Fix |
| --- | --- |
| Opening Roads/Zones selected no tool, so a new player's first drag only moved the camera | Opening a category picks the usual tool (street, low density; remembers your last pick) |
| "Something is in the way" did not say what | Says road / building / power line, and suggests placing beside the road |
| Zone preview gave no sign that tiles were too far from a road | Those tiles turn orange and the cursor counts them |
| Empty residential zones were almost invisible on grass | Brighter wash, solid outline and larger density markers for all zones |
| Hovering a zoned tile showed "$0 · 0 tiles" | Shows "Already zoned" |
| Tutorial reset the tool itself, so a habitual Esc opened the pause menu | Tool is left alone |
| On phones the target area fell off-screen / under the card; the data-view menu covered the card | Camera fits targets into the free area; the data-view menu closes after a pick on narrow screens |

## Known gaps (not implemented)

* **Camera rotation** – the renderer has one view direction.
* **Curved / diagonal roads** – roads are grid-aligned.
* **Trams, metro** – not present. The train station, cargo terminal and airport are single buildings with
  economic effects (demand, income, noise); there are no rail lines or flights to route.
* **Web Workers** – the simulation runs on the main thread (about 0.2 ms per frame in tests).
* **Terraforming**, pipe tool (water follows roads), four-way building rotation (two orientations exist).
* **Individual citizens** – people are cohorts and per-building totals, as the brief allows.
* **Vehicle following** – visible cars follow real routes and stop at red lights but do not queue behind
  each other; congestion itself is computed in the aggregate model.
* **Save export/import to a file.**
* Budget controls are per department, not per building.

## Not verified

* **Audio** is fully synthesised and wired up, but the test environment has no speakers: it has not been
  listened to. Expect to tune volumes and the music generator.
* **Real-GPU frame rate.** Headless Chrome with software rendering: ~3–4 ms per frame at 1600×900 with a
  resting camera, more while panning. Not measured on real hardware or with cities above ~10,000 residents.
* **Late game.** Ranks 5–7 (15,000+ residents), nuclear power, airport, landmark and high-rise balance
  have only been exercised in isolation, never reached by play.
* **Scenarios** – start conditions are tested; winning and timing out are implemented but not played through.
* **Touch** – pan, pinch and drag-to-build work under emulation; not tested on a real phone.
* Firefox, Edge and Brave were not run; only Chrome. Nothing browser-specific is used beyond `-webkit-` fallbacks.

## Balance notes (current values, all in `js/buildings.js`, `js/population.js`, `js/economy.js`)

* 1 day = 0.5 s at 1× speed; 30-day months; a year is 3 minutes.
* Start: $50,000 (easy 80k, hard 35k). Bot town reaches 500 residents in ~6 months, 2,000 in ~1.5 years.
* A well-served town of 2,000 runs a surplus of roughly 25 %; bots that neglect services pile up cash,
  which suggests upkeep could rise further once real play data exists.
* Residential demand is driven mainly by happiness, so neglect slows growth rather than stopping it dead.

## Where to continue (suggested order)

1. Play a full game to Metropolis by hand and retune income/upkeep and level thresholds for ranks 4–7.
2. Listen to the audio; adjust.
3. Vehicle following and visible queues at lights.
4. Rail: track tool, stations as nodes, trains as agents (reuse `Roads.path` with a second network layer).
5. Camera rotation: needs `Art` to draw each design from 4 sides and the tile scan to iterate rotated.
6. Save export/import; cloud-free sharing of seeds.
7. Web Worker for `Env.pollution`, `Env.landValue` and trip assignment if large cities need it.

## Conventions for future sessions

* Classic scripts, one global `M`; no modules or build step so the game runs from `file://`.
* Simulation modules never touch the DOM, so they load in Node for tests.
* Everything that changes the map goes through `M.Build` (costs, undo, events) – including tests.
* Events on the bus: `dirty` (tile redraw), `bld`, `built`, `placed`, `month`, `news`, `tier`, `achievement`.
* When adding a building: add a `def(...)` in `buildings.js` and a `des(...)` in `sprites2.js`; the toolbar,
  inspector, budget and unlock list pick it up automatically.
* Keep `test/sim-test.js` and `test/mechanics-test.js` green; add an assertion with every new mechanic.

## 0.9.1 — performance
- **Scrolling ground cache**: the terrain layer (chunks + sky + night tint) lives in a screen-sized canvas. On pan it is shifted and only the newly exposed strips are painted (`paintGround(c, rects)` in `Rn.draw`); camera is snapped to device pixels so the shift is exact. Verified pixel-identical to a full repaint. Panning cost at 1600×900@2x: ~100–185 ms → ~5 ms for the ground stage.
- Night tint is baked into that layer (quantized to 24 steps) instead of a full-screen multiply every frame.
- **Dusk/dawn**: `S.blend(sp, lit, step)` keeps one pre-blended day→night sprite per 1/16 step (14 built per frame, dropped again by `S.dropBlends` at full day/night) instead of drawing every building twice.
- **Dynamic resolution**: `Rn.adapt(dt, fps)` lowers `Rn.scale` (1 → 0.6, steps of 0.1) when draw time > 16 ms and fps < 42 for 1.5 s, and raises it again when there is headroom. `settings.autoRes === false` turns it off. Medium quality caps the pixel ratio at 1.5.
- Fixed: `buildRoutes` replaced `T.cars` while `T.update` was still iterating the old array, so a removed car could sit in both `T.cars` and `T.free` and get recycled as another vehicle (fire engines and buses vanished). Now filtered in place.

## 0.10.0 — building variety ×20, smoother cornering
- **80 looks per zone level instead of 4** (`S.NV`). `S.zforms[zone][level]` is a list of building *forms*; a variant picks `forms[v % n]` and passes a style seed, and every form reads colours, heights, roofs and details from its seeded rng. Form 0 is the original design in `sprites.js`; four more per level live in **`js/sprites3.js`** (60 new designs: L-houses, bungalows, cube villas, canal houses with step gables, terraced blocks, courtyard blocks, round towers, twin towers, cinema, hotel, art-deco office, big-box store, shopping street, resort, farm, silos, container terminal, refinery, steel mill, cement works, cooling towers, data centre, lab dome, …). All 1200 variants are generated and checked by `/tmp/gen.py`-style loop (no errors, none taller than its sprite `S.ZH`).
- `S.variant(b)` = `(b.v + hash(x, y)) % 80`, so existing saves get the variety too. New buildings roll `v` in 0..79.
- **Sprite memory**: sprites carry a last-used stamp (`sp.u`); `S.trim()` (every 150 frames) evicts unseen sprites once the cache exceeds 170/110/60 MB (high/medium/low). Generation is spread over frames (`S.GEN_BUDGET` 6 ms): past the budget a building briefly shows an already-drawn neighbour of the same level.
- **Vehicles turn through bends**: `S.vehicleH(type, h, col)` draws oriented boxes for 16 headings; `place()` sets `c.h/c.hx/c.hy` from the Bezier tangent, so sprite, headlights and tail lights follow the curve. The bend's control point is the exact meeting point of entry and exit lane. Cars brake gently *before* a bend (`g.nturn`) instead of in it; braking for traffic is still hard.
- Test: the fire test accepts more than one extinguished fire (a fire may spread before the engine arrives).

## 0.10.1 — lighter evenings, livelier windows
- Night tint is one constant, `S.NIGHT = [98,114,184]` (was 58,78,160), used by the night sprites, the ground layer and occluder tiles; the blue night grade is softer.
- `litOf(sp)` in `sprites.js` decides the lit windows per building design: lit share 20–70 %, mixed colours (`S.WINCOL`), some buildings cool-white or single-coloured, varying brightness. `sp.sd` is the design seed.
- A few dark windows per building (`S.twinkle(sp)`, 6–12 depending on size) switch on and off at runtime with a short fade (in `drawBuildingPart`, only above zoom 0.5).

## 0.11.0 — recorded music
- `music/main-menu.mp3` loops in the main menu; `music/cozy-city-1..6.mp3` play in the city in shuffled order (every track once before a repeat, 2.5 s pause between tracks). About 24 MB in total, ~190 kbps.
- Player lives in `js/audio.js` (`A.music`, `A.musicTick`): one `<audio>` element that streams (no WebAudio routing, so it also works from file://), fades on menu↔city changes, starts after the first click or key press, pauses when the tab is hidden or the music volume is 0.
- If the files cannot be loaded (e.g. a copy of the game without the `music/` folder), the old generated tune plays instead.
- Options show the current track and, in the city, a "Next track" button (`music-next` action in `menu.js`).
- Window lights: realistic lamp colours (`S.WINCOL`: warm, neutral and cool white, rare TV blue and amber) and the on/off switching is rare now — 4 or 6 windows per building each reconsider every 3–10 minutes.
