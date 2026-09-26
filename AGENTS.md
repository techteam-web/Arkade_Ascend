# Project instructions

## Responsive design applies to every page

The user requires this page and all future pages to adapt to phones, tablets, touch tablets, flip/foldable devices, dual-screen layouts, Mac/Windows laptops, desktops, and ultrawide displays.

- Design around available width, height, orientation, and input capabilities, not device brands or user-agent sniffing.
- Reuse the usable-panel pattern in `.page-frame`: safe-area insets, container queries, and fluid bounded typography and spacing.
- Keep content and controls out of exposed foldable hinges using viewport-segment features where supported. Ordinary responsive layout is the fallback when segment information is unavailable.
- Keep touch targets at least 44 by 44 CSS pixels. Do not make functionality depend on hover. Support mouse, touch, keyboard, and reduced motion.
- The site is a full-screen, single-viewport sales presentation: the document never scrolls and each page is designed to fit the viewport. Where a short window or zoom cannot fit a page, its `.page-scroll` region scrolls so nothing becomes unreachable. Use safe centering (`justify-center-safe`, `[align-content:safe_center]`) in scrollable regions. Do not disable browser zoom.
- Size decorative canvas scenes to their actual container; map pointer positions relative to canvas bounds. Use lower rendering quality for compact or coarse-pointer devices.
- Keep content readable on narrow split-screen windows and landscape phones, not only standard portrait breakpoints.
- For new pages, check representative sizes: 320x568, 390x844, 844x390, 768x1024, 1024x768, 1440x900, 1920x1080, and 2560x1080. Include narrow foldable panels, orientation changes, 200% zoom, keyboard focus, and touch behavior.
- Run the production build after code changes. Report visual/device checks honestly; never claim every physical device was tested from a build alone.

## Presentation shell

- The app only runs in full screen. `src/app/FullscreenGate.jsx` covers the app until the visitor taps; leaving full screen brings the gate back and keeps the route. Browsers without the Fullscreen API (iPhone Safari) get a one-time start screen instead. `?fullscreen=off` bypasses the gate in development builds only, for automated screenshots.
- Styling is Tailwind v4 (`src/styles/index.css`). Custom breakpoints: `3xl` 1920px, `4xl` 2560px, `5xl` 3840px; the root font size also steps up at each. Layout variants: `split` (two columns on laptops and on landscape phones), `stack` (portrait phones and tablets), `short` (height ≤ 544px). Use tone-aware colours (`text-fg`, `text-muted`, `border-line`, `text-accent`) and set `data-tone="light"` on cream grounds.
- New pages: add the route to `src/app/routes.js` and `src/app/TransitionStage.jsx`, choose a scene preset in `src/scenes/sceneStore.js`, and mark arriving elements with `data-reveal` (see `src/app/reveal.js`).
- GSAP with React StrictMode: wrap effect animations in `gsap.context()` and `revert()` it on cleanup; never `tween.kill()` a `from()` tween. Do not give GSAP-animated elements CSS transitions on `transform`, `opacity` or `filter`; animate hover nudges with the separate `translate` property instead.
- Typography: the brochure's own fonts are served from `public/fonts` (see `src/styles/brand-fonts.css`): Billie Eilish for headlines, Gotham Book/Medium for text, labels and figures, Avenir LT Std Black for the lockup, Swiss 721 Condensed for map labels, Myriad Pro for the north arrow. No other typefaces, and no italic serif. Put every number in `.num` (upright, lining, tabular); never set figures in italic. Separate an index from its label with space, not long dash rules.
- Restraint: the presentation is minimal and premium, not flashy. The silk veil is the only 3D element in the site, and it appears only on Home and the Neu Gen gilded chapter (brochure page 2); every other page sits on a still gradient preset. Do not add other WebGL models (the Tower page uses the concept render with a 2D level band). No glitter, particles, bloom, spinning lights, pulsing or pinging elements, glows, blur transitions or elastic/overshoot easing. Motion is short fades and small rises (about 1 s or less); interactive elements change colour or shift a few pixels.
- The shared canvas renders on demand (`sceneStore.dirty`, set by `setScenePreset`): continuously only while the silk is on screen or a mood is blending. Still pages stay at zero draw calls.
- Location uses MapLibre like our other projects' maps (Zenith, Hariko): OpenFreeMap's Positron style recoloured to the brochure palette, extruded 3D buildings (the project's plot in gold; OpenStreetMap heights above 200 m are tagging errors and are drawn low-rise), a tilted camera (pitch 55, bearing -18) flown with GSAP, road routes from OSRM (an arc if unavailable), and a 3D / 2D / brochure-map switch. It loads lazily with the page. Keep the OpenStreetMap attribution visible. Offline, the page falls back to the brochure map. Live-map positions are indicative and labelled so.
- Animation ownership (prevents overlapping or half-finished animations):
  - Each animated property of an element has one owner. An entrance tween and an interactive tween must not both drive, say, `scale`; animate a proxy value or a wrapper instead.
  - Interactive tweens that can retrigger use `overwrite: true` or `'auto'`. Sequenced player timelines (chapters, carousels) kill the previous run and settle other states before starting.
  - Route changes: the stage stops the page's entrance before its exit, and the exit fades the whole page, not only `data-reveal` items. Navigation from the menu (`location.state.instant`) swaps pages before paint, and the menu closes in the same commit as the new location. React Router renders navigations as transitions, so never close overlays in a separate urgent update.
  - Page-owned 3D (like the tower) reads `sceneStore.leaving` and `sceneStore.menuOpen` and fades with the page. Its one-time entrance runs only when its page mounts.
- Content that is not in the brochure lives in `src/content/template.js` and is labelled "indicative" on screen. Never present template content as confirmed project fact.
