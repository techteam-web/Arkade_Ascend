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
| 03 | `/tower` | Illustrative 3D twin-tower massing at night: drag to rotate; hover, click or tap a floor (or use the slider) to light it | template |
| 04 | `/residences` | Tower concept art, paths to Floor Plans and a Unit Finder over the unit data | brochure p. 6 |
| 05 | `/floor-plans` | Unit 1 (4 BHK) plan: zoom/pan, room schedule that locates each room, full-screen plan viewer, key plan | brochure p. 6 |
| 06 | `/specifications` | Category tabs with image slots | template |
| 07 | `/amenities` | 3D ring carousel | template |
| 08 | `/views` | Draggable skyline panorama: three elevations, morning/sunset/night | template |
| 09 | `/location` | Brochure map with animated routes to each connectivity point and distance | brochure p. 5 |
| 10 | `/gallery` | 3D card carousel, filters, full-screen lightbox | existing concept images + brochure p. 4 |
| 11 | `/enquire` | Validated enquiry form | — |

Navigation: the Explore menu (arrow keys, Enter, Esc), the Arkade logo (home), and on stepped pages the wheel, swipe or arrow keys.

## Design system

- **Palette** (from the brochure, in `src/styles/index.css`): primary gold `#c49a6c`, secondary plum `#4e373c` (page 3), accent champagne `#ecd3a8`. Espresso `#1b1113` (cover), cream `#f4edcc` (map and plan pages) and the page-2 gold ground `#cea572` complete it.
- **Type:** the brochure's faces are Billie Eilish (display), Gotham (text) and Avenir LT Std Black (logo). All three are commercial, so they are not bundled. `src/styles/brand-fonts.css` uses them wherever they are installed (Avenir ships with macOS and iOS); to serve them to every visitor, add the licensed web-font files to `public/fonts/` and uncomment the `url()` lines. Fallbacks: Bodoni Moda and Montserrat. All numbers use the `.num` style: upright, lining, even-width figures.
- **Breakpoints:** Tailwind defaults plus `3xl` 1920px, `4xl` 2560px and `5xl` 3840px. The root font size steps up at each, so layouts scale proportionally to 4K. Layout variants: `split`, `stack` and `short` (see AGENTS.md).
- **Motion:** `src/app/reveal.js` choreographs every `data-reveal` element when a route arrives (lines, chars, masks, rules, count-ups) and releases them on exit. A champagne light sweep crosses the screen between pages. `prefers-reduced-motion` shows final states directly.

## 3D scene

A single persistent canvas (`src/scenes/silk/SilkScene.jsx`) sits behind every page and blends between brochure moods defined in `src/scenes/sceneStore.js`: `home`, `cover`, `gilded`, `plum`, `heart`, `cream`, `menu` and others. Half the pages use the silk (Home, Neu Gen, Tower, Residences, Enquire). The other half use gold threads with mist (Specifications, Amenities, Gallery, Floor Plans, Location).

- **Silk veil** (`shaders.js`): a three-layer recreation of the page-2 silk. It has a travelling S-curve with a slow roll, breathing width and billows. The fabric is sheer where it faces the camera and dense at folds, with Ward anisotropic satin highlights, pearl speckle and drifting clusters of twinkling glitter (HDR, so only glints bloom). The mouse lifts the cloth and moves the key light.
- **Gold dust:** additive motes travelling with the veil.
- **Gold threads** (`src/scenes/threads/GoldThreads.jsx`): a surface woven from fine gold strands flowing in slow waves. Light gathers where strands bunch into folds, and beads of light travel along them.
- **Golden mist:** a domain-warped smoke drifting in the backdrop shader.
- **Menu emblem** (`src/scenes/emblem/ArkadeEmblem.jsx`): the Arkade mark extruded from the brochure's vector paths in polished gold. It sits inside two thin rings and an orbiting glitter halo, fits the menu's anchor, and half-turns as you move between sections.
- **Tower massing** (`src/scenes/tower/TowerModel.jsx`): instanced floors rise into place on arrival. It has smoked glass with sparse warm windows (anti-aliased mullions, no pulsing bloom), bronze slabs and fins, glowing crown lanterns and a light-ring plinth. It raycasts the pointer to find the floor under it, fits a DOM anchor on the Tower page, and reports the shown floor's screen position for the callout.
- **Quality tiers:** screens ≤900px wide or with a coarse pointer render at lower DPR, with fewer segments and particles and SMAA instead of MSAA.

## Content

- `src/content/project.js`: brochure facts (copy, Unit 1 areas and room sizes, connectivity distances, map coordinates).
- `src/content/template.js`: **placeholder** specifications, amenities, view captions and the gallery list. It is labelled "indicative" on screen while `isTemplate` is true. An empty `image` shows a gold placeholder frame, so renders can be dropped in later.
- `public/brochure/`: images extracted from the brochure (see `public/asset-notes.md`).

## Source layout

```text
src/
  App.jsx                 gate, canvas, header, menu, stage
  app/                    routes, transitions, reveal choreography, header, menu, gate
  pages/                  one component per route
  scenes/                 sceneStore, silk/ (veil, dust, mist backdrop), threads/, emblem/, tower/
  components/             brand mark, page kit (heading, image slot, figures)
  content/                brochure facts, template content, enquiry delivery
  hooks/                  fullscreen, media queries, stepper (wheel/swipe/keys)
  styles/index.css        Tailwind theme, tokens, component classes
  styles/brand-fonts.css  brochure typefaces (local or licensed files)
```

## Verification status

The production build passes. The pages were screenshotted in desktop Chrome (Playwright) at 390×844, 844×390, 768×1024, 1024×768, 1440×900, 1920×1080, 2560×1080 and 3840×2160. The runs also exercised the full-screen gate (enter, exit, resume), keyboard menu navigation and focus return, reduced motion, the finder, the enquiry form, floor-plan room focus and full-screen viewer, tower floor picking by hover and click, and the amenities ring holding still between items, with no console errors. The tower flicker reported on one machine could not be reproduced here; its likely causes were removed (a masked scroll layer over the canvas, a pulsing bloomed floor, shimmering window lines), so please recheck on that machine. Not verified: physical phones and tablets, iOS Safari, foldable hinge segments, GPU performance on low-end devices, and Firefox/Safari rendering.
