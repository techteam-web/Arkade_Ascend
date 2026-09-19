# Arkade Ascend

A responsive React landing page for Arkade Ascend, Malad West, based on the supplied visual reference. Built with Vite, React Three Fiber, Three.js, and postprocessing.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, normally http://localhost:5173. On Windows PowerShell, use `npm.cmd` instead of `npm` if script execution policy blocks `npm.ps1`.

## Current design

- Dark espresso and burgundy backdrop with a softly masked sunset skyline.
- Centered ARKADE / ASCEND / MALAD WEST identity, fine vertical gold rules, and corner captions.
- Bronze-gold ribbons framing the page, with deep brown folds, restrained amber highlights, and fine lengthwise silk texture.
- Continuous ribbon flow and twisting, with damped cursor deformation and camera parallax.
- Gold dust attached to both edges of each ribbon, following its shape, movement, and cursor response.
- Circular Enter button with a crisp gold border, dark satin fill, balanced label and arrow spacing, and no exterior glow.
- Button interactions include subtle magnetic movement, an interior satin sweep and inset ring on hover or keyboard focus, arrow movement, and press feedback.
- ASCEND has a restrained champagne glow following the letterforms and a slow satin highlight across its gold fill. Reduced-motion preferences keep the highlight static. The former flare on the D and the button's blurred edge highlights remain removed.

Enter opens the full-screen menu. Close, Escape, or Home returns to the landing page and restores focus to Enter. The seven numbered rows update the selected state and section counter; Gallery opens the gallery page; other destination pages and the enquiry flow are not implemented yet.

## Files

| File | Purpose |
| --- | --- |
| `src/App.jsx` | Landing composition, magnetic button handling, menu open/close state |
| `src/MenuPage.jsx` | Full-screen responsive menu, numbered rows, selected state, focus handling, Close/Escape |
| `src/index.css` | Responsive layout, typography, skyline masking, button appearance and interactions |
| `src/GoldRibbon.jsx` | Ribbon geometry and shaders, attached particles, animation, lighting, camera and postprocessing |
| `public/mumbai-dusk.png` | Generated skyline background |
| `public/asset-notes.md` | Skyline generation method and original prompt |
| `index.html` | Page title, description, theme color and React entry point |

The skyline is an atmospheric generated image, not a verified view from the property. See [asset notes](public/asset-notes.md). Cormorant Garamond and Montserrat load from Google Fonts, with local fallback fonts defined in CSS.

## Ribbon and particle implementation

Each `Ribbon` owns its deformation uniforms. Its mesh and `RibbonDust` share those same uniform objects and the GLSL `ribbonPoint()` function. Particles are positioned from the deformed ribbon edges in the same transformed group, rather than drawn as a separate screen-space layer.

Each ribbon has 3,600 deterministic particles. A dense fringe near the edges tapers into sparse floating dust. Depth testing lets the ribbons occlude particles, while additive blending gives visible dust a warm metallic appearance.

The animation clock advances continuously using frame delta, capped at 0.05 seconds to avoid large jumps when returning to the tab. World-space pointer coordinates are converted into each ribbon's local space before deformation. Silk grain is based on surface UV coordinates so it stays on the fabric during movement.

## Appearance and motion controls

The landing page currently mounts the background as:

```jsx
<GoldRibbonBackground
  className="ribbon-scene"
  bgColor="#28150e"
  backdrop="transparent"
/>
```

The transparent backdrop exposes the page's atmosphere and skyline. Quality defaults to `high`; setting `quality="low"` removes depth of field and chromatic aberration and lowers the DPR cap. The page automatically selects low quality for viewports up to 900px wide or devices with a coarse primary pointer.

In `src/GoldRibbon.jsx`:

- `goldRamp()` controls dark bronze, midtone copper-gold, and warm crest colors in linear light.
- `specBroad` and `specHot` control highlight width and intensity. Keep highlights restrained to avoid the previous pale, washed-out appearance.
- Ribbon `speed`, `amp`, `freq`, `twist`, and `twistFreq` control flow and folds. Group positions and rotations control placement around the title.
- `RibbonDust` controls particle count, edge spread, size, opacity, and color. Preserve the shared deformation and uniforms when tuning these values.
- `uPointerR` and the bulge multiplier control cursor influence.
- Bloom intensity and threshold control the scene's luminous highlights. The HTML button is styled separately in CSS.

Reduced-motion preferences pause automatic ribbon motion and disable CSS transitions and magnetic button movement. New cursor-driven ribbon and camera movement is ignored for touch input and while reduced motion is requested.

## Rendering constraints

- Keep `EffectComposer` multisampling at `0` while depth of field is enabled; SMAA handles antialiasing.
- Ribbons occupy separate depth slabs. Preserve their separation when changing placement or width.
- Keep custom program cache keys on patched materials, and update them when shader variants change.
- The shadow depth material must use the same vertex deformation as the visible ribbon.
- Keep shader-deformed ribbons and particles exempt from frustum culling: their undeformed geometry bounds do not represent their rendered positions.

## Build and validation

```bash
npm run build
npm run preview
```

Production files are written to `dist/`. The latest build passed. JavaScript output is approximately 1.16 MB uncompressed / 351 kB gzipped; Vite reports a large-chunk warning, primarily from the 3D rendering dependencies.

A successful build does not validate runtime WebGL shader compilation or visual fidelity. Automated browser preview was unavailable during these changes, so inspect the page in a browser for final visual approval. Check the moving ribbons and attached dust, button hover/focus/press states, Enter and Back behavior, and narrow-screen layouts.



## Responsive foundation for current and future pages

Project-wide requirements are recorded in [AGENTS.md](AGENTS.md).

The landing page uses a safe-area-aware `.page-frame` with container queries. Type, spacing, and decorative rules size against that usable panel. Compact-width, short-height, and ultrawide layouts adapt separately. Short windows can scroll instead of clipping the page to the browser height. Viewport-segment media queries keep the composition in the first panel of a dual-screen/foldable viewport where the browser exposes that feature; unsupported browsers use the regular responsive layout.

Touch devices use a lighter postprocessing profile and do not require hover or magnetic interaction to operate the Enter button. The menu supports keyboard dismissal, contains keyboard focus, and restores focus to Enter. Canvas pointer mapping uses the canvas bounds so safe-area and panel offsets do not misalign interaction.

Physical device and browser coverage remains to be verified; the implementation does not imply testing on every device model. Use the representative viewport and interaction checklist in AGENTS.md for future page work.


## Menu page

The menu reference is implemented as a dark split layout with the compact brand at top left, seven numbered rows, a gold active indicator, contextual row hints, and an active-section counter. Residences is selected initially to match the supplied reference. The right side combines the existing skyline with a menu variant of the live ribbon scene and the Spaces / People / Possibilities / A higher you text.

At compact widths the navigation fills the panel over a subdued decorative backdrop. The menu scrolls when its content exceeds available height; navigation rows remain at least 44px tall. Close and Escape return to the landing screen. Only one ribbon canvas is mounted at a time. Gallery is connected; the remaining destination pages remain to be created.


## Gallery page

Open Enter > Gallery. `src/GalleryPage.jsx` implements the reference composition with a central gold-bordered image, angled adjacent previews, circular navigation arrows, category filters, section marker, and Explore menu control. There are four images in All, including three generated architectural concepts and the existing sunset skyline. The counter shows the actual filtered image count, not the reference's illustrative 18-image count.

Controls: previous/next buttons, Left/Right arrow keys while focused within the carousel, or horizontal touch swipes. Category buttons filter the collection and reset selection; one-image categories disable the arrows. Explore opens the menu, Close returns to the gallery with selection preserved, and the logo or Home menu item returns to the landing page. No autoplay is used. Narrow screens remove side previews and use larger central imagery; controls remain at least 44px. Reduced-motion settings disable transitions.

Gallery images are generated concepts, not confirmed project renders. Saved paths and complete generation prompts are in [asset notes](public/asset-notes.md). Production build passed; browser and physical-device checks remain unavailable in this session.

Gallery navigation now animates persistent image cards through center, left, right, and rear positions using perspective, rotation, depth, and smooth easing. All image assets are predecoded on gallery mount. Rapid navigation retargets the CSS transitions without queued timers; reduced-motion preferences switch positions immediately.
