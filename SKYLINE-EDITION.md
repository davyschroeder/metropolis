# METROPOLIS — Skyline Edition

Visual revision of Metropolis 0.13.0. No build step or external dependencies.

Open `index.html` from the extracted folder, or serve the folder through any static web server. Keep the original folder structure, including music and fonts. All interface text is English.

## Changes
- New Skyline Edition identity, responsive cinematic menu and animated live city backdrop.
- Teal and ivory HUD, panels, construction cards, minimap frame, and buttons.
- Improved procedural architecture: directional material shading, rooftop edges and seams, glass reflections and window frames.
- Layered trees, softer contact shadows, refined terrain texture, turquoise water with ripples, and road surface shading and curbs.
- Refined night colors; existing day/night, traffic and weather systems remain in place.

## Compatibility and checks
- Simulation source, construction logic, save format, game version and music files are unchanged. Existing saves should remain compatible when opened under their original browser origin; browser storage does not migrate automatically to a different URL or folder.
- `node test/mechanics-test.js`: all 57 checks passed.
- `node test/sim-test.js 6`: all checks passed.
- Chromium smoke checks (local HTML, scripts and styles inlined for the test): main menu, new city, road palette, placing seven road tiles, rendering and landscape touch menu; no JavaScript page errors. Browser policies prevented direct file or localhost navigation in the test environment, so persistent storage and audio loading were not end-to-end tested.
