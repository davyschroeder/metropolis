# METROPOLIS – City Builder

An isometric city-building and management simulation written in plain HTML5, CSS3 and JavaScript
(Canvas 2D). No engine, no build step, no server code, no external dependencies.

## Play

Open `index.html` in Chrome, Firefox, Edge or Brave. That is all – it also works from `file://`.

Live at **https://metropolis.davyschroeder.nl/**. Cloudflare Workers Builds deploys every push to `main`
(`wrangler.jsonc`; `.assetsignore` keeps tests and docs off the site). Any other static host works too:
upload `index.html`, `css/` and `js/`.

## Controls

| Action | Input |
| --- | --- |
| Pan | Drag with the Inspect tool, right- or middle-drag, `W A S D` / arrows, two fingers on touch |
| Zoom | Mouse wheel, `+` `-`, pinch |
| Build categories | `1`–`0`, `B` bulldozer, `Q` inspect |
| Rotate building | `R` |
| Cancel tool | Right-click or `Esc` |
| Speed | `Space` pause, `[` slower, `]` faster |
| Data views | `Tab` cycles, `M` toggles the minimap |
| Undo / quick save | `Ctrl+Z` / `Ctrl+S` |

## How the city works (short version)

* Everything needs a **road** within 2 tiles. Roads also carry **electricity and water** to everything within 3 tiles.
* Paint **zones**; buildings appear and upgrade by themselves when the R/C/I demand bars are positive.
* Services, pollution, crime, noise, commute time and taxes decide **happiness** and **land value**,
  which decide who moves in and how tall the city grows.
* Money comes from taxes and goes to upkeep. Watch the monthly balance.

## Project layout

```
index.html          page shell, loads the scripts in dependency order
css/style.css       interface styling
js/core.js          namespace, maths, seeded RNG, noise, colours, event bus, heap
js/buildings.js     all static data: roads, zones, buildings, tiers, policies, achievements, scenarios
js/terrain.js       seeded terrain generation
js/world.js         tile grid, building registry, city state, serialisation
js/roads.js         road network, connectivity, A* pathfinding
js/utilities.js     electricity, water, sewage, garbage
js/services.js      service coverage maps and capacities
js/environment.js   pollution, noise, crime, land value, weather, fires, disasters
js/zoning.js        zone growth, upgrades, lot merging
js/population.js    cohorts, jobs, education, health, happiness, demand
js/economy.js       taxes, upkeep, budgets, loans, business cycle, bankruptcy
js/traffic.js       trip assignment, congestion, buses, vehicle and pedestrian agents
js/progression.js   tiers, objectives, achievements, scenarios
js/construction.js  tools, placement rules, costs, demolition, upgrades, undo
js/camera.js        pan, zoom, picking
js/sprites.js       procedural art toolkit, zoned buildings, vehicles, trees, road tiles
js/sprites2.js      procedural art for placeable buildings
js/renderer.js      chunked terrain, depth-sorted objects, lighting, weather, overlays, minimap
js/engine.js        fixed-tick simulation clock and main loop
js/save.js          IndexedDB save slots, autosave, settings
js/audio.js         synthesised music, ambience and effects
js/ui.js            HUD, toolbar, toasts, modals, tooltips
js/panels.js        inspector and information panels
js/menu.js          main menu, new game, save/load, options
js/input.js         mouse, touch, keyboard
js/main.js          boot
test/               automated tests (see PROGRESS.md)
```

All code and art are original; every sprite is drawn procedurally at run time and every sound is synthesised.
See `PROGRESS.md` for what is implemented, what was verified, known gaps and where to continue.
