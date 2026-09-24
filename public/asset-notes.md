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
- `gallery/exterior.png`: A tall elegant contemporary residential tower in Mumbai at dusk, dark stone and bronze facade, warm illuminated balconies and architectural edges, viewed from low angle, city around its base, dramatic copper sunset sky. No text or signage.
- `gallery/amenities.png`: An elegant rooftop infinity swimming pool at dusk, water reflecting amber architectural lights, planted trees and lounge seating, bronze-toned covered terrace on right, Mumbai-like skyline and sunset beyond. Wide architectural photography.

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
