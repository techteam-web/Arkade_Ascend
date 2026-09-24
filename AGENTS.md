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
- Typography: brochure fonts come from `src/styles/brand-fonts.css` with free fallbacks. Put every number in `.num` (upright, lining, tabular); never set figures in italic. Separate an index from its label with space, not long dash rules.
- 3D moods: half the pages use the silk veil, the other half gold threads with mist. Keep that balance when adding pages; the menu has its own `menu` preset with the gold emblem.
- Animation ownership (prevents overlapping or half-finished animations):
  - Each animated property of an element has one owner. An entrance tween and an interactive tween must not both drive, say, `scale`; animate a proxy value or a wrapper instead.
  - Interactive tweens that can retrigger use `overwrite: true` or `'auto'`. Sequenced player timelines (chapters, carousels) kill the previous run and settle other states before starting.
  - Route changes: the stage stops the page's entrance before its exit, and the exit fades the whole page, not only `data-reveal` items. Navigation from the menu (`location.state.instant`) swaps pages before paint, and the menu closes in the same commit as the new location. React Router renders navigations as transitions, so never close overlays in a separate urgent update.
  - Page-owned 3D (like the tower) reads `sceneStore.leaving` and `sceneStore.menuOpen` and fades with the page. Its one-time entrance runs only when its page mounts.
- Content that is not in the brochure lives in `src/content/template.js` and is labelled "indicative" on screen. Never present template content as confirmed project fact.
