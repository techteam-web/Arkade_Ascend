# Skyline asset

File: public/mumbai-dusk.png
Generated with the built-in imagegen tool. This is an atmospheric illustration of a Mumbai skyline, not a verified view from the property.

Prompt:
Create a photorealistic atmospheric background asset for a luxury Mumbai property website, landscape 1536x1024. Mumbai suburban skyline at dusk, small distant residential towers silhouetted, one slim tall tower on left third, a few midrises, low hazy hills behind. Tiny warm window lights, dark trees in foreground. Amber setting sun very near left edge at 50% image height. Sky muted copper brown with soft textured clouds, fading into extremely dark espresso burgundy at right and top. Skyline concentrated lower half. Cinematic warm bronze monochrome, underexposed, subtle film grain. No text, no letters, no logos, no ribbons. This is a background layer, realistic photographic detail, gentle atmospheric haze.

## Gallery assets

Generated with the built-in imagegen tool and saved in `public/gallery/`. These are concept illustrations, not verified property photographs. The existing `public/mumbai-dusk.png` is used in the Lifestyle category.

Each prompt uses this prefix and suffix:

Prefix: Use case: ads-marketing. Create a photorealistic luxury property gallery concept image, wide landscape 1536x1024.

Suffix: Cinematic architectural photography, premium editorial quality, refined warm copper, espresso and champagne palette, realistic materials, detailed but restrained, no people, no text, no logos, no watermark. This is a standalone full-bleed photograph, no frames or UI.

Subjects between prefix and suffix:

- `gallery/interior.png`: An expansive luxury apartment living room, ivory curved sectional sofa on left, dark marble oval coffee table, textured rug and bronze armchair on right, walnut panels and abstract painting at left, floor-to-ceiling glass across the back looking over a Mumbai-like skyline and distant hills at amber sunset.
- `gallery/amenities.png`: An elegant rooftop infinity swimming pool at dusk, water reflecting amber architectural lights, planted trees and lounge seating, bronze-toned covered terrace on right, Mumbai-like skyline and sunset beyond. Wide architectural photography.

The generated exterior concept (`gallery/exterior.png`) was removed on 6 Oct
2026: the gallery's Exterior category now shows the project's final renders.

## Exterior renders (`public/gallery/exterior/`)

From the supplied `Exterior Final Renders` (6 Oct 2026): eight renders, PNG
and JPEG in sRGB, 6000 px on the long side (4800 x 6000 for the two tall
views), 229 MB in all. Each was resized (Lanczos) to 1600 and 2880 px on its
long side and saved as WebP (quality 82) without its profile (sRGB is the
web's default), about 7.4 MB for all sixteen files; the gallery picks a size
per screen (`srcSet`). The originals' names map as follows:

- `cam12-day`: Ascend_Cam12_Day_Final; `cam28-day`: Ascend_Cam_28_Day_Final
- `cam40-day`: Ascend_Cam40_Day_Final; `cam02-day`, `cam02-twilight`:
  Ascend_Cam02_Day_Final, Ascend_Cam02_Twilight_Final
- `cam38-twilight`: Ascend_Cam38_Twilight_Final; `cam27-evening`:
  Ascend_Cam27_Evening_Final; `cam06-evening`: Ascend_Cam06_Evening_Final

`cam02-twilight` is also the menu's picture for The Tower. The renders show
the two wings in the same V as the tower model (`ascend-block.glb`).

## Residences assets

`residences/tower-concept.png` is the source render (concept illustration, not a
verified photograph of the property). It sits on a near-black vignette rather
than transparency.

`residences/tower-cutout.png` is the file the Residences screen actually loads.
It is the same pixels with a real alpha channel: the connected dark surround was
flood-filled inwards from the image border (luminance threshold 0.14) and the
resulting silhouette feathered with a 3px box blur. The building's own shadowed
faces are never reached by the fill, so they stay opaque. This is what lets the
live gold ribbon pass behind the towers instead of being clipped by a black
plate. Regenerate it from the source if the render is ever replaced.

`tower-concept.png` is kept only as that source. Nothing references it at
runtime, so it can be moved out of `public/` if the ~2.2 MB matters.

## Residences tower concept
Asset: `public/residences/tower-concept.png` (transparent PNG, reused for two independently interactive matching towers). Generated using OpenAI imagegen. Illustrative concept, not verified project architecture.

Full prompt: Create a photorealistic architectural concept asset with a truly transparent background, portrait 1024x1536. One complete freestanding luxury residential tower in Mumbai, full building from rooftop to landscaped podium visible, no cropping. Tall slender 35-storey contemporary tower, dark bronze vertical fins and warm charcoal stone, numerous balconies and glass windows illuminated with restrained champagne-gold light at dusk, elaborate elegant stepped rooftop crown. Three-quarter architectural view with front and right facade visible, nearly straight verticals, camera at mid-building height. Small integrated 3-storey podium with trees at base. Building occupies 85% image height and 65% width, centered with transparent space around all silhouette edges. High-end realistic architectural visualization, dark bronze and warm amber, crisp fine detail. No skyline, no sky, no ground plane outside podium, no ribbons, no text, no logos, no watermark, no labels. Transparent alpha background. This is illustrative concept architecture, not a claimed actual building.

## Brochure extracts (`public/brochure/`)

Taken from `brochure design.pdf` (Adobe Illustrator, September 2026). The embedded photos are CMYK JPEGs inverted by a PDF Decode array; they were decoded, negated back to positive and graded with sharp. The vector pages were rendered with mutool at 220 dpi and cropped.

- `lifestyle-arrival.webp`: page 4 photograph (the brochure marks it "All representational image").
- `cover-satin.webp`: page 1 satin fabric, remapped to the cover's plum-brown tones.
- `silk-fallback.webp`: page 2 silk photograph multiplied at 50% over the #cea572 ground, matching the spread. Kept as a static reference or fallback for the 3D silk.
- `location-map.webp`: page 5 map, left two-thirds. The brochure marks it "Indicative map, not to scale".
- `floor-plan-unit-1.webp`, `key-plan.webp`: page 6 plan and key plan. The brochure marks the plan "Dummy render".
- `favicon.svg` and the `ArkadeMark` component use the Arkade logo paths from page 2's vector artwork.

## Views panoramas (`public/views/`)

Three 360° drone panoramas (day, evening, night), exported as tiled cube maps
by the Marzipano Tool. The drone's heading and tilt differed between flights,
so the day and night tiles were re-projected onto the evening shot's frame:
about 12,000 (day) and 1,900 (night) SIFT matches against evening gave the
rotation, the full-resolution faces were resampled (Lanczos) and re-tiled at
JPEG quality 85, progressive, the same as the export. Residual misalignment is
about 0.03°. Nearby rooftops still differ slightly between times, because the
drone hovered in a slightly different spot each time (parallax, which no
rotation can remove).

- Day: rotated 1.73° (its front direction lands at yaw −1.63°, pitch +0.40°).
- Night: rotated 1.09° (yaw +0.22°, pitch +0.98°).
- Evening: untouched.

`still.webp` in each folder (the no-WebGL fallback, and the menu preview for
evening) is rendered from the page's opening view (`INITIAL_VIEW` in
`src/pages/ViewsPage.jsx`: yaw 0.105, pitch 0.03, fov 1.47 rad), so the tower
sits in the same place in all three.

The unaligned day and night exports, and the original evening still, are kept
in `source-assets/views-unaligned/` (outside `public/`, so not deployed). Any
replacement panorama needs the same alignment before it goes into
`public/views/`.

## Arkade Ascend logo (`public/logo/arkade-ascend-white.webp`)

From the supplied `Arkade Ascend Logo.png` (white artwork on a transparent
6000 × 3000 canvas). The empty canvas was trimmed to the artwork plus a 12 px
margin and the result resized to 2400 px wide (lossless WebP, alpha kept), so
it stays sharp on large and high-density screens. Used on the Neu Gen page's
"Presenting" chapter.

## Arkade Ascend lockup as outlines (`src/components/AscendLockup.jsx`)

Home draws the white lockup in with GSAP DrawSVG, which needs paths. The mark
and rule are taken as supplied from `Arkade Ascend Logo-01.svg`. Its two text
lines (live Avenir LT Std Black in the SVG) were converted to one path per
letter from `public/fonts/avenir-lt-std-black.woff2` with opentype.js, using
the SVG's sizes, tracking and 97% horizontal scale, then each letter was
nudged (at most 2.8 units) so the outlines match `Arkade Ascend Logo.png`:
overlap with the PNG is 98.5%. Regenerate it the same way if the logo changes.

## Brochure of 24 Sep 2026 (`Arkade Ascend-Brochure - 24-9-2026.pdf`)

Photographs were taken from the PDF's own embedded images (`mutool show -b -e`),
not from page renders, so they carry no printed text or tints, at their full
resolution. Each was matched to its printed label by position (`mutool trace`
for the image boxes, structured text for the labels), then resized to at most
2000 px and saved as WebP (quality 80). The brochure marks them "All
representational image"; the tower is a "Dummy render" and the kitchen an
"artist impression", and the pages show those notes.

- `welcome-balcony-1600.webp`, `-2880.webp`: page 5 (WELCOME TO NEU GEN LIFE),
  cropped to 1.6:1 from the 7210 × 5084 original with the woman about 28%
  across, so she stays clear of the card on wide and 4:3 screens alike.
- `specs/`: tower (p. 10), arrival lobby (p. 12), living & dining, guest suite,
  kitchen and bedroom (p. 14), parking, security, fire-fighting and CCTV
  (p. 21). The bedroom original is CMYK, so it was cut from a 220 dpi page
  render instead, without its printed label.
- `amenities/`: the 22 Club Ark photographs of pages 15–20. Page 19's text
  layer also names a "Meditation studio", but no photograph for it is visible
  on the page, so it is not listed (page 18's Meditation zone is).

## NEU GEN monogram (`src/components/NeuGenMark.jsx`)

From `Arkade Ascend-Brochure - 24-9-2026.svg` (THE / NEU GEN / LIFE). The five
letter paths (NEU over GEN, sharing one E) and the two rules are used as
supplied. THE and LIFE are live Billie Eilish text in the file; they were
converted to that font's outlines (`public/fonts/billie-eilish.woff2`, via
opentype.js) at the file's size (136.41) and tracking (0.2 em), so the whole
mark can be drawn with DrawSVG. The file's grey fill is an export colour; the
pages colour the mark with `currentColor` (gold on the cover, ivory in the
welcome card, plum for the watermark).

## Map model (`public/models/ascend-map.glb`)

The Location map's lighter copy of the tower model, built from
`ascend-block.glb` by `tools/map-model` (`cd tools/map-model && npm install &&
npm run build`, about four minutes; it uses Chrome). On the map the tower is
at most a few hundred pixels tall, so it carries about a fifth of the full
model: 264,342 triangles drawn instead of 1,322,534, 24 draw calls instead of
774, 1.2 MB instead of 4.7 MB. Repeated parts were merged into one mesh per
material, each material simplified as far as it still looks the same (about
6 cm; finer for the rails and louvres; the crown's ARKADE ASCEND sign exact),
and faces no map camera can see (backs of fins, undersides of ledges, the
inside) removed after drawing the model from 7,200 directions. The faces are
shaded flat. Material names are unchanged, so the same finishes apply. When
the final model replaces `ascend-block.glb`, run the tool again; check its
material names against `EXACT` and `FINER` in `build.mjs` first.
