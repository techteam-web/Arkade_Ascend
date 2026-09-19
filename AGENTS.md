# Project instructions

## Responsive design applies to every page

The user requires this page and all future pages to adapt to phones, tablets, touch tablets, flip/foldable devices, dual-screen layouts, Mac/Windows laptops, desktops, and ultrawide displays.

- Design around available width, height, orientation, and input capabilities, not device brands or user-agent sniffing.
- Reuse the usable-panel pattern in `.page-frame`: safe-area insets, container queries, and fluid bounded typography and spacing.
- Keep content and controls out of exposed foldable hinges using viewport-segment features where supported. Ordinary responsive layout is the fallback when segment information is unavailable.
- Keep touch targets at least 44 by 44 CSS pixels. Do not make functionality depend on hover. Support mouse, touch, keyboard, and reduced motion.
- Preserve scrolling when the viewport is too short or the user zooms. Do not disable browser zoom or globally lock body scrolling.
- Size decorative canvas scenes to their actual container; map pointer positions relative to canvas bounds. Use lower rendering quality for compact or coarse-pointer devices.
- Keep content readable on narrow split-screen windows and landscape phones, not only standard portrait breakpoints.
- For new pages, check representative sizes: 320x568, 390x844, 844x390, 768x1024, 1024x768, 1440x900, 1920x1080, and 2560x1080. Include narrow foldable panels, orientation changes, 200% zoom, keyboard focus, and touch behavior.
- Run the production build after code changes. Report visual/device checks honestly; never claim every physical device was tested from a build alone.
