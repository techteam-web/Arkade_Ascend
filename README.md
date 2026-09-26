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

To deliver enquiries, set `VITE_ENQUIRY_ENDPOINT` to a JSON webhook (CRM or form service). Without it, enquiries are queued in the device's `localStorage` under `arkade-ascend-enquiries`. That queue holds visitors' contact details, so export and clear it regularly.

## Pages

| # | Route | Page | Source |
|---|---|---|---|
| 01 | `/` | Home: ASCEND over the flowing silk; Enter opens the menu | brochure pp. 1–2 |
| 02 | `/neu-gen` | Neu Gen Life: four chapters (cover satin, gilded silk, *want it all*, Neu Gen Heart) | brochure pp. 1–4 |
| 03 | `/tower` | The concept render with a gold level band: hover, click or tap the facade, or use the slider or arrow keys | concept render (levels indicative) |
| 04 | `/residences` | Tower concept art, paths to Floor Plans and a Unit Finder over the unit data | brochure p. 6 |
| 05 | `/floor-plans` | Unit 1 (4 BHK) plan: zoom/pan, room schedule that locates each room, full-screen plan viewer, key plan | brochure p. 6 |
| 06 | `/specifications` | Category tabs with image slots | template |
| 07 | `/amenities` | Framed feature image with a numbered index | template |
| 08 | `/views` | Draggable skyline panorama: three elevations, morning/sunset/night | template |
| 09 | `/location` | Tilted 3D MapLibre map in the brochure palette with extruded buildings: category tabs (roads, rail & metro, airports, upcoming), pins, road routes drawn to each place, a 3D / 2D switch, and the brochure map as a toggle and offline fallback | brochure p. 5 + OpenStreetMap |
| 10 | `/gallery` | Flat filmstrip carousel, filters, full-screen lightbox | existing concept images + brochure p. 4 |
| 11 | `/enquire` | Validated enquiry form | — |

Navigation: the Explore menu (arrow keys, Enter, Esc), the Arkade logo (home), and on stepped pages the wheel, swipe or arrow keys.

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

`src/pages/location/LiveMap.jsx` follows our other projects' location maps (Zenith, Hariko). It uses [MapLibre GL](https://maplibre.org/) with [OpenFreeMap](https://openfreemap.org/)'s Positron style (free, no API key, OpenStreetMap data), recoloured to the brochure's cream map page. It adds extruded 3D buildings, with the project's plot in gold, and a tilted camera (pitch 55°, bearing −18°) that flies to frame each journey. Visitors can drag to pan, right-drag or two-finger-drag to rotate and tilt, or switch to a flat 2D view. Routes follow the roads, from the public [OSRM](https://project-osrm.org/) demo server; if it is unreachable, a gentle arc stands in. The map loads only with the Location page. Positions come from OpenStreetMap and are indicative: the project pin sits on Liberty Garden Cross Road No. 4, Malad West; confirm it against the site plan in `src/content/project.js`. Distances shown are the brochure's. Without a connection the page shows the brochure map instead (`BrochureMap.jsx`).

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
  scenes/                 sceneStore, silk/ (veil and still backdrop), tower/
  components/             brand mark, page kit (heading, image slot, figures)
  content/                brochure facts, template content, enquiry delivery
  hooks/                  fullscreen, media queries, stepper (wheel/swipe/keys)
  styles/index.css        Tailwind theme, tokens, component classes
  styles/brand-fonts.css  brochure typefaces (local or licensed files)
```

## Verification status

The production build passes. The pages were screenshotted in desktop Chrome (Playwright) at 390×844, 844×390, 768×1024, 1024×768, 1440×900, 1920×1080, 2560×1080 and 3840×2160. The runs also exercised the full-screen gate (enter, exit, resume), keyboard menu navigation and focus return, reduced motion, the finder, the enquiry form, floor-plan room focus and full-screen viewer, tower level selection by hover, click, slider and keys, the amenities frame holding still between items, and the Location tabs, pins, route drawing, keyboard tabs, brochure toggle and offline fallback, with no console errors. The tower flicker reported on one machine could not be reproduced here; its likely causes were removed (a masked scroll layer over the canvas, a pulsing bloomed floor, shimmering window lines), so please recheck on that machine. Not verified: physical phones and tablets, iOS Safari, foldable hinge segments, GPU performance on low-end devices, and Firefox/Safari rendering.
