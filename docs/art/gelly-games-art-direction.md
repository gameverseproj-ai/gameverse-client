# Game halls — shared art direction

The four games are rooms of Gelly World, using `gelly-world-target-v2-assets.png` as the visual reference.

- Snake: mint and lime, a living garden, a coiled snake souvenir.
- 2048: amber and gold, rounded candy-stone tiles, a temple and floating crystal.
- Tetris: violet and pink, glossy toy blocks, a miniature assembly hall.
- Power: coral and warm orange, a golden fist, lit stone arches and a glowing arena.

Shared rules: indigo twilight, the same illustrated world backdrop, the pink jelly explorer, sculpted frames, soft corners, inset highlights, solid button shadows. Gameplay grids and directional controls remain LTR in every language. Decorations are hidden from assistive technology and stop animating with reduced-motion preferences.

Implementation: `src/styles/_gelly-games.scss`, the `HallArtComponent`, plus the Tetris and Power canvas renderers. The background JPEG is 1536×1024 and reused across all four games. Its PNG master is kept here for future art iterations.

## Background provenance

Generated with the built-in image_gen tool. Style reference: `docs/art/gelly-world-target-v2-assets.png`.

Production asset: `public/assets/gelly/ui/halls-panorama-v1.jpg`.
Master: `docs/art/gelly-games-panorama-v1.png`.

Final prompt:

> Use case: stylized-concept. Asset type: wide panoramic background illustration for four playable game screens in Gelly World. The supplied image is a STYLE REFERENCE ONLY, not an edit target. Create one cohesive landscape, aspect ratio 3:2, high-quality whimsical 3D clay/jelly videogame environment matching the reference's rounded glossy toy architecture, richly saturated blue violet twilight, pink clouds, magical glowing paths, floating islands, candy trees and faceted crystals. Compose a beautiful far landscape across the lower half: a small lush green snake-shaped hall at far left, golden stepped temple with levitating amber crystal at left center, violet block factory at right center, coral orange gym with giant golden fist at far right. Buildings must be modest scale and spaced apart, no large foreground building. Foreground edges have purple stone, teal plants, pink mushrooms and glowing crystals; center foreground is an open indigo-purple softly lit plaza. Upper half mostly deep indigo open sky with sparse stars and large soft lavender clouds at edges, with room for UI overlay. Warm light from portals and cool blue rim lights. Give appealing tactile sculpted detail and rich depth, avoid gritty photorealism. No text, no letters, no numbers, no labels, no UI, no watermark, no border, no collage. This is a production game world backdrop; readable dark open center with colorful scenery framing it.
