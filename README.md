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

The transparent backdrop exposes the page's atmosphere and skyline. Quality defaults to `high`; setting `quality="low"` caps DPR at 2 rather than 2.5. Depth of field and chromatic aberration are removed in both profiles for sharpness. The page automatically selects low quality for viewports up to 900px wide or devices with a coarse primary pointer.

In `src/GoldRibbon.jsx`:

- `goldRamp()` controls dark bronze, midtone copper-gold, and warm crest colors in linear light.
- `specBroad` and `specHot` control highlight width and intensity. Keep highlights restrained to avoid the previous pale, washed-out appearance.
- Ribbon `speed`, `amp`, `freq`, `twist`, and `twistFreq` control flow and folds. Group positions and rotations control placement around the title.
- `RibbonDust` controls particle count, edge spread, size, opacity, and color. Preserve the shared deformation and uniforms when tuning these values.
- `uPointerR` and the bulge multiplier control cursor influence.
- Bloom intensity and threshold control the scene's luminous highlights. The HTML button is styled separately in CSS.

Reduced-motion preferences pause automatic ribbon motion and disable CSS transitions and magnetic button movement. New cursor-driven ribbon and camera movement is ignored for touch input and while reduced motion is requested.

## Rendering constraints

- The composer uses multisampling `0` with SMAA antialiasing. Depth blur and chromatic aberration are disabled to keep ribbon edges and particles crisp.
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

The menu reference is implemented as a dark split layout with the compact brand at top left, seven numbered rows, a gold active indicator, contextual row hints, and an active-section counter. 03 Residences is selected initially, following the updated seven-item menu structure. The right side combines the existing skyline with a menu variant of the live ribbon scene and the Spaces / People / Possibilities / A higher you text.

At compact widths the navigation fills the panel over a subdued decorative backdrop. The menu scrolls when its content exceeds available height; navigation rows remain at least 44px tall. Close and Escape return to the landing screen. One shared canvas stays mounted across intro, menu, and gallery, with no scene replacement during navigation. Gallery is connected; the remaining destination pages remain to be created.


## Gallery page

Open Enter > Gallery. `src/GalleryPage.jsx` implements the reference composition with a central gold-bordered image, angled adjacent previews, circular navigation arrows, category filters, section marker, and Explore menu control. There are four images in All, including three generated architectural concepts and the existing sunset skyline. The counter shows the actual filtered image count, not the reference's illustrative 18-image count.

Controls: previous/next buttons, Left/Right arrow keys while focused within the carousel, or horizontal touch swipes. Category buttons filter the collection and reset selection; one-image categories disable the arrows. Explore opens the menu, Close returns to the gallery with selection preserved, and the logo or Home menu item returns to the landing page. No autoplay is used. Narrow screens remove side previews and use larger central imagery; controls remain at least 44px. Reduced-motion settings disable transitions.

Gallery images are generated concepts, not confirmed project renders. Saved paths and complete generation prompts are in [asset notes](public/asset-notes.md). Production build passed; browser and physical-device checks remain unavailable in this session.

Gallery navigation now animates persistent image cards through center, left, right, and rear positions using perspective, rotation, depth, and smooth easing. All image assets are predecoded on gallery mount. Rapid navigation retargets the CSS transitions without queued timers; reduced-motion preferences switch positions immediately.


### Sharp ribbon and particle rendering

Depth-of-field blur and chromatic aberration are removed. Bloom is limited to bright highlights and film grain is reduced. Device pixel ratio is capped at 2.5 for high quality and 2 for compact/touch rendering. Edge particles use defined circular silhouettes, shaded gold bodies, rim highlights, and small reflections; larger beads remain mixed with fine grains. Particles continue to follow the live ribbon geometry. Build validation passed; runtime visual verification is still required.


## Cinematic intro-to-menu transition

`src/useIntroTransition.js` uses a single reversible GSAP timeline (1.7 seconds) to coordinate the DOM and a mutable motion reference consumed by the existing R3F scene. The shared canvas, ribbon meshes, particle geometry and materials remain mounted through Enter, Close, and Gallery navigation. No page reload or ribbon opacity fade is used.

Sequence: button acknowledgement; staggered title release with depth blur; ribbon translations, rotation and a restrained camera-facing pass; an expanding burgundy panel with a softened moving edge; upper-left brand reveal; staggered rows and drawing dividers; movement of the original right-side copy; Close and footer details; final active-row accent and hint. Particle motion briefly accelerates and brightness increases by 18%, with a small trailing fringe, then settles.

Close and Home reverse the intro timeline. Reduced-motion preferences resolve directly to the end state. Resizing rebuilds measured copy positions for the current usable panel and resolves to the requested state. Compact layouts retain their existing menu arrangement and hide the decorative right-side copy when it has no destination. Navigation to Gallery remains connected.

Production build passed. Exact screenshot fidelity, WebGL playback, repeated open/close interactions and physical-device behavior still need browser verification; no browser is connected to this session.


### Menu structure and previews

The seven route IDs are `home`, `tower`, `residences`, `location`, `amenities`, `gallery`, `enquire`. The Tower is the future exterior orbit destination. Interior 360 belongs within a selected residence, not in the primary navigation. The menu stays on 03 Residences by default.

Pointer hover and keyboard focus reveal each row's three-line contextual copy, move the title 8px, brighten its number/divider and draw a champagne underline. The counter follows the previewed item and returns to 03 / 07 when the preview ends. Highlights have no filled backgrounds. A separate GSAP preview state provides restrained ribbon responses without interfering with the intro transition: The Tower shifts outward slightly and increases particle energy; Residences slightly flattens the ribbon. Preview values settle back when focus/hover ends or the menu closes.

All buttons dispatch their route ID. Only existing Home and Gallery destinations navigate; the App handler guards the remaining routes until their pages are implemented. No orbit or apartment discovery page is created by this menu refinement.


## Cinematic menu-to-gallery transition

`src/useGalleryTransition.js` coordinates a 1.7-second GSAP sequence when 06 Gallery is selected. The clicked row acknowledges first; other rows release in order, Gallery last. The panel retracts with an architectural mask while the cinematic area widens. The same live ribbon meshes sweep into a broader gallery pose, accompanied by a restrained particle-energy lift.

Gallery branding and title resolve before the central image, then the side panels, controls, filters, microcopy, and Explore trigger appear. Arrival animation uses separate CSS variables so it does not replace the carousel's existing 3D transforms. The real image count and filter behavior remain intact. Intro, menu, and gallery now share a single mounted canvas.

Explore reverses the sequence back to the menu. The gallery brand returns through the menu to the intro. Navigation is locked while a sequence is running. Reduced-motion users get the final state directly. On return, the intro controller remeasures the menu-copy destination to account for viewport changes. The initial menu design and seven navigation labels are preserved.

Production build passes. Browser playback, exact visual matching, and device checks remain unverified because no connected browser is available.

## Residences entry
- Menu item 03 opens the twin-tower entry through a reversible 1.5-second GSAP transition. Explore returns to the existing menu; the brand returns home.
- `ResidencesExperience.jsx` keeps discovery mode, requested stage, active tower/floor/unit and compare selection in one journey state. Visual Select and Unit Finder prepare their respective stages while retaining the entry composition. Future screens are not implemented.
- Separate tower focus/touch previews, restrained pointer parallax, reduced motion, responsive container layouts and the persistent live ribbon are supported. This screen uses a single viewport with no page scrolling.
- Tower A/B are temporary labels. The generated architecture is illustrative concept art, not official project architecture or inventory.
- Browser/device visual verification remains pending because no browser surface was available in this session.

### Entry refinement verification
- Corrected SVG arrow sizing/animation, architectural preview selectors, footer rule, skyline reveal binding, and hidden live announcements.
- Preserved existing navigation and persistent WebGL scene. Discovery requests remain on the entry composition; finder mode clears the visual tower emphasis.
- Added stacked mobile discovery actions, tablet spacing, explicit preview lighting and a short/zoomed viewport scrolling fallback for access to controls.
- Production build passed on 21 September 2026 (Vite reports the existing large JavaScript chunk warning).
- Browser inventory returned no connected surfaces. The requested viewport matrix, 200% zoom, physical touch, animation playback and visual comparison remain unverified.

## Menu to Residences choreography refinement
The reversible GSAP timeline now lasts 1.8 seconds: selected-row acknowledgement; other rows withdraw first; selected row exits last; the split panel softens; existing ribbon meshes travel through a temporary sweep; the existing editorial copy travels to its lower-left destination; title, buttons, towers, callout lines and Explore resolve in sequence. The starting and ending screen styles and ribbon material/geometry are retained.

Reduced motion resolves immediately, including when the preference changes during playback. Focus moves after React restores interaction, and Explore returns focus to the Residences menu row. Production build passed; browser playback, exact screenshot matching and viewport/device checks remain unverified because no browser is connected.

## Ribbon-led residences arrival
The transition now lasts 2.1 seconds. During travel, the original silk meshes deform into depth-bearing arcs around the measured twin-tower composition; their existing materials and idle shapes remain unchanged. Attached dust follows the same curved surface. A preloaded pair of alpha-tested tower planes temporarily provides silhouette occlusion in the same continuously mounted canvas. The planes follow the DOM tower bounds and camera perspective, then hand off to the original interactive artwork at 1.52s. The residences UI starts resolving at 1.54s.

Reduced motion skips the wrapping pass. If the tower texture is not ready, the entry retains its DOM architecture and uses the underlying travel transition. No additional canvas or scene reload is introduced.

Validation: production build passed; `node tests/residence-transition.cjs` passed for timeline duration, depth handoff and three forward/reverse cycles with concurrent lighting. This is a GSAP state regression test with layout stubs, not a browser-rendering test. Visual handoff, shader playback and device performance remain to be verified in a connected browser.

## Unit Finder landing screen
The residences Unit Finder action now opens an editorial two-path screen within the same experience. Guided Finder and Unit Filter provide pointer/keyboard previews and retain the selected path, with an honest coming-soon announcement. Full guided questions, filtering and inventory results are not implemented and no apartment data is invented. Back to Residences and Escape restore the entry, while Explore uses the existing global menu return.

The shared header, towers, atmospheric background, ribbon and microcopy persist. Tablet paths stack where needed; mobile places the architecture above the two choices and preserves scrolling. The existing navigation state regression test passes. Visual checks at the required viewport sizes, physical devices and WebGL playback remain unverified without a connected browser.

## Woven satin realism pass
Only the existing ribbon implementation (`src/GoldRibbon.jsx`) was revised; page transforms, typography, navigation timelines and pointer damping remain intact. Material response now uses physical lighting before output/tone mapping, filtered procedural weave in surface normals, broad/micro roughness variation, narrower shadow-aware Kajiya–Kay highlights, a darker reverse face and a rounded selvedge instead of background-colour edge painting. Secondary folds and bounded 8% peak-to-peak width variation preserve the overall path.

Dust keeps the edge/trail concept with deterministic 70% micro / 20% small / 9% medium / 1% hero populations, fold clustering and particle-only circle-of-confusion blur. Reduced bloom thresholds isolate HDR creases/sparkles. A grazing warm key, weak bronze fill and champagne spotlight rim provide three-point illumination. Geometry density, shadow-map resolution and DPR have quality tiers; no extra full-screen DOF pass was added.

Validation: production build, `node tests/silk-shader.cjs`, and `node tests/residence-transition.cjs` passed. Shader tests expand installed Three.js chunks and check patch ordering; they do not compile on a GPU. Visual output, GPU shader compilation and 60fps desktop performance require browser validation and are not claimed as measured.

## Current source layout

```text
src/
  App.jsx                         App state and persistent scene composition
  main.jsx                        React entry point
  pages/
    menu/MenuPage.jsx
    gallery/GalleryPage.jsx
    residences/
      ResidencesExperience.jsx
      UnitFinder.jsx
  transitions/                    GSAP intro, gallery and residences hooks
  scenes/gold-ribbon/
    GoldRibbonBackground.jsx      Canvas and postprocessing
    Scene.jsx                     Lighting, ribbon placement and widths
    Ribbon.jsx                    Ribbon mesh and live uniforms
    RibbonDust.jsx                Edge dust and slow surface glints
    shaders.js                    Shared GLSL surface deformation and shading
    material.js                   Three.js shader patch integration
    palette.js                    Shared brand colours
    useDampedPointer.js           Pointer and camera damping
    useWarmEnvironment.js         Environment lighting texture
    ResidenceDepthArchitecture.jsx
  styles/
    index.css                     Imports in original cascade order
    base.css
    menu.css
    gallery.css
    transitions.css
    residences.css
    unit-finder.css
```

The old root-level page, ribbon and transition files have moved to the locations above. The shader test now imports the material module directly. Production build and both regression scripts pass; the emitted stylesheet hash is unchanged, confirming the stylesheet split preserved its compiled output. Browser/device checks were not performed. Both ribbon widths are halved in `Scene.jsx`: upper 1.95 and lower 1.6 world units.
