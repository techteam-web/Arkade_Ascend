# Arkade Ascend — sales presentation

A full-screen, single-viewport sales presentation for Arkade Ascend, Malad West. It is themed from the September 2026 brochure (`brochure design.pdf`). Built with React 18, React Router 7, Tailwind CSS 4, GSAP 3 (SplitText, CustomEase), Three.js and React Three Fiber.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
npm run preview
```

The presentation opens behind a full-screen gate: tap or click anywhere to enter. Leaving full screen pauses it behind the gate again, keeping the current page. In Chromium, Esc is captured with the Keyboard Lock API, so it closes menus and lightboxes; press and hold Esc to leave full screen. For development screenshots, add `?fullscreen=off` to the URL. This works in `npm run dev` only.


## Pages

| # | Route | Page | Source |
|---|---|---|---|
| 01 | `/` | Home: the white Arkade Ascend lockup draws itself in (GSAP DrawSVG) over the flowing silk; Enter opens the menu | brochure pp. 1–2, supplied logo |
| 02 | `/neu-gen` | Neu Gen Life: four chapters (cover satin, gilded silk, *want it all*, and *Welcome to Neu Gen Life* on the balcony photograph with the brochure's copy). The brochure's interlocked NEU GEN monogram draws itself in on the cover and the welcome card, and is the watermark of *want it all* | brochures of Sep 2026 (pp. 1–3) and 24 Sep 2026 (p. 5) |
| 03 | `/tower` | Full-page drone orbit over the site: 360 frames of the DJI footage (`public/orbit/`, AVIF, 1280 and 854 px wide) dragged through with easing and a glide on release, always one whole frame (no blending, which ghosts); wheel, track and arrow keys too; a drag hint until the first move. Key figures over it | drone footage |
| 04 | `/residences` | Key figures and two paths beside the building model. Visual selection hides the text and centres the model: Tower A and Tower B are chosen separately. Pointing at a tower previews that tower's floor only (gold on its facade), click or tap or the Tower A/B switch and arrow keys select, then its floor plans open (`/floor-plans?tower=A&floor=n`). The Unit Finder takes over the page too: filters for configuration, plan type, tower, floor range (with lower/middle/upper bands), RERA area range, facing, view and features, each chip showing how many homes it would leave; results as plan-type cards or a sortable list of single homes; up to three plan types compared side by side. Its inventory (both towers, every residential floor, four homes a floor, six plan types) is indicative sample data in `src/content/template.js`; only Type A is the brochure's Unit 1, and the other types show the Unit 1 drawing labelled as a placeholder. The model carries a note that it is a temporary representation | brochure p. 6, architectural model |
| 05 | `/floor-plans` | The chosen home (`?home=A-1203`), the homes on a floor (`?tower=A&floor=n`), or a plan type (`?plan=C`); Unit 1 (Type A, 4 BHK) by default. Zoom/pan, full-screen viewer, the other homes on the same floor, and a way back to the unit finder. Type A has the room schedule that locates each room and the key plan; sample types show their key facts over the placeholder drawing | brochure p. 6, sample inventory |
| 06 | `/specifications` | The tower, arrival, residences and safety & convenience, from the brochure, each with the brochure's photographs; features with their own photograph (bedrooms, kitchens, security) show it when chosen | 24 Sep 2026 brochure pp. 10, 12, 14, 21 |
| 07 | `/amenities` | Club Ark: 22 amenities in five groups (pools, active living, fitness, pursuits, gatherings), each with the brochure's photograph and line; wheel, swipe and arrows step through them all | 24 Sep 2026 brochure pp. 15–20 |
| 08 | `/views` | 360° drone panoramas at 120 m (Marzipano, tiled cube maps in `public/views/`): opens on the skyline's tall tower and turns slowly until stopped (Stop/Start rotation button; dragging or the arrows pause it for a few seconds). Day, Evening and Night are aligned to one frame and crossfade in place, even while turning or dragging; aligned still images stand in without WebGL | project panoramas |
| 09 | `/location` | Full-screen tilted 3D MapLibre map in the brochure palette with extruded buildings. A floating plum panel (right on laptops, a bottom sheet on portrait phones and tablets) holds the headline, category tabs (roads, rail & metro, airports, upcoming) and places; road routes draw to each place and are framed in the part of the map the panel leaves open. A Nearby tab lists the brochure's everyday places by category (page 9; no positions, so no pins), and Upcoming includes the Borivali–Thane Twin Tunnel. The 3D / 2D / brochure-map switch sits beside the logo; the brochure map is also the offline fallback. The tower model stands on its site, under the map's weather: haze, a soft cloud deck seen when zoomed out (parting around the route), drifting cloud shadows, and one sun that casts the tower's shadow; the first arrival comes down through the clouds. A Dusk switch in the panel turns the map to evening, with the tower's windows lit | brochure p. 5 + OpenStreetMap |
| 10 | `/gallery` | Flat filmstrip carousel, filters, full-screen lightbox | existing concept images + brochure p. 4 |

Navigation: the Menu button (arrow keys, Enter, Esc), the Arkade logo (home), and on stepped pages the wheel, swipe or arrow keys.

## Design system

- **Palette** (from the brochure, in `src/styles/index.css`): primary gold `#c49a6c`, secondary plum `#4e373c` (page 3), accent champagne `#ecd3a8`. Espresso `#1b1113` (cover), cream `#f4edcc` (map and plan pages) and the page-2 gold ground `#cea572` complete it.
- **Type:** the brochure's own fonts, served as WOFF2 from `public/fonts/` (`src/styles/brand-fonts.css`): Billie Eilish (headlines), Gotham Book and Medium (text, labels, figures), Avenir LT Std Black (lockup), Swiss 721 Condensed (map labels) and Myriad Pro (north arrow). They are commercial fonts: serving them on a public site needs web-embedding rights under their licences. All numbers use the `.num` style (upright Gotham); counters hold their final width because Gotham's figures are proportional.
- **Breakpoints:** Tailwind defaults plus `3xl` 1920px, `4xl` 2560px and `5xl` 3840px. The root font size steps up at each, so layouts scale proportionally to 4K. Layout variants: `split`, `stack` and `short` (see AGENTS.md).
- **Motion:** deliberately quiet. `src/app/reveal.js` brings each `data-reveal` element in with a short fade or rise (lines, rules, masks, count-ups) when a route arrives, and pages cross-fade between routes. No blur, glitter, glows or overshoot. `prefers-reduced-motion` shows final states directly.

## 3D scene

A single persistent canvas (`src/scenes/silk/SilkScene.jsx`) sits behind every page and blends between brochure moods defined in `src/scenes/sceneStore.js`. The silk is the site's only 3D element. The canvas renders on demand: continuously only while the silk is on screen or a mood is blending, and not at all on still pages.

- **Silk veil** (`shaders.js`): a three-layer recreation of the page-2 silk, on Home and the Neu Gen gilded chapter only. It has a travelling S-curve with a slow roll, breathing width and billows, sheer where it faces the camera and dense at folds, with soft Ward anisotropic satin highlights. No glitter or particles. The mouse lifts the cloth slightly.
- **Still grounds:** every other page uses a still gradient with one soft pool of light and a vignette.
- **Quality tiers:** screens ≤900px wide or with a coarse pointer render at a lower pixel ratio with fewer segments.

## Location map

`src/pages/location/LiveMap.jsx` follows our other projects' location maps (Zenith, Hariko). It uses [MapLibre GL](https://maplibre.org/) with [OpenFreeMap](https://openfreemap.org/)'s Positron style (free, no API key, OpenStreetMap data), recoloured to the brochure's cream map page. It adds extruded 3D buildings, all in one solid warm brown, and a camera that stays close to the tower (`shots.js`): its front by default, and for each place a view from the tower looking out, the route running from the tower's foot towards the place, tilted up to the horizon for far ones; after a moment the camera rises above the whole route, so the distance it covers shows. The camera circles the tower between places, and the first arrival spirals down onto it through the clouds. Visitors can drag to pan, right-drag or two-finger-drag to rotate and tilt, or switch to a flat 2D view. Routes follow the roads, from the public [OSRM](https://project-osrm.org/) demo server; if it is unreachable, a gentle arc stands in. The map loads only with the Location page. Positions come from OpenStreetMap and are indicative: the project pin sits on Liberty Garden Cross Road No. 4, Malad West; confirm it against the site plan in `src/content/project.js`. Distances shown are the brochure's. Without a connection the page shows the brochure map instead (`BrochureMap.jsx`).

The tower stands on its site in `towerLayer.js`, a three.js layer drawn in the map's own WebGL context (camera, depth and light shared, so the city's buildings hide it and it hides them). It is a lighter copy of the Residences model (`public/models/ascend-map.glb`, see `public/asset-notes.md` for rebuilding it from the final model). The same layer draws the weather from one drifting cloudiness field: the clouds (seen from above when zoomed out, parting wherever they would cover the framed route or the tower), their shadows on the ground, haze to the horizon, and the tower's own shadow from the map's sun. The Dusk switch blends the map's colours, the sun, the sky and clouds, and lights the tower's windows. The weather is lighter on touch screens and off on low-power devices; it never moves under reduced motion, and the map stops redrawing behind the menu or in a hidden tab.

## Content

- `src/content/project.js`: brochure facts (copy, Unit 1 areas and room sizes, connectivity distances, map coordinates).
- `src/content/template.js`: **placeholder** specifications, amenities, view captions and the gallery list. It is labelled "indicative" on screen while `isTemplate` is true. An empty `image` shows a gold placeholder frame, so renders can be dropped in later.
- `public/brochure/`: images extracted from the brochure (see `public/asset-notes.md`).

## Source layout

```text
src/
  App.jsx                 gate, canvas, header, menu, stage
  app/                    routes, transitions, reveal choreography, header, menu, gate
  pages/                  one component per route (location/ holds the live and brochure maps)
  scenes/                 sceneStore, silk/ (veil and still backdrop), building/ (tower model and floor helpers)
  components/             brand mark, page kit (heading, image slot, figures)
  content/                brochure facts, template content
  hooks/                  fullscreen, media queries, stepper (wheel/swipe/keys)
  styles/index.css        Tailwind theme, tokens, component classes
  styles/brand-fonts.css  brochure typefaces (local or licensed files)
```

## Verification status

The production build passes. The pages were screenshotted in desktop Chrome (Playwright) at 390×844, 844×390, 768×1024, 1024×768, 1440×900, 1920×1080, 2560×1080 and 3840×2160. The runs also exercised the full-screen gate (enter, exit, resume), keyboard menu navigation and focus return, reduced motion, the finder, the enquiry form, floor-plan room focus and full-screen viewer, the amenities frame holding still between items, and the Location tabs, pins, route drawing, keyboard tabs, brochure toggle and offline fallback, with no console errors. The tower flicker reported on one machine could not be reproduced here; its likely causes were removed (a masked scroll layer over the canvas, a pulsing bloomed floor, shimmering window lines), so please recheck on that machine. Not verified: physical phones and tablets, iOS Safari, foldable hinge segments, GPU performance on low-end devices, and Firefox/Safari rendering.

The Location map's tower and weather (8 Oct 2026) were checked in headless Chrome with the Mac's GPU at 320×568, 390×844, 844×390, 768×1024, 1024×768, 1440×900, 1920×1080, 2560×1080, a 280×653 fold panel and 200% zoom (no overlaps, no page scroll), with a 4× slowed CPU (arrival flight held 60 fps), reduced motion, the menu pause, a lost and restored WebGL context, quick route changes, WebGL 1, no WebGL, offline and a blocked model. Not verified: frame rates on real phones and low-end GPUs, and Safari's and Firefox's WebGL.
