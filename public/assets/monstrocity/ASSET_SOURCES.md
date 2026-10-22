# Monstrocity assets

The original scene raster assets here were created with the built-in image_gen tool for this project. No Jelly World or Neon World assets are reused.

- cover.png: approved courtyard concept; welcome screen and Worlds card only. Source prompt: docs/art/monstrocity/courtyard-prompt.txt. Not used as the 3D game scene.
- mossback.png: transparent original creature artwork for the first 2D encounter and the world warning sprite. Prompt: “One full-body broad moss-covered stone creature, short powerful legs, expressive arms, layered stone/bark, amber eyes, closed mouth, facing viewer, cinematic handpainted 3D look, transparent background, no scenery or text.” The original generated prompt additionally specified mobile adventure, clear silhouette and warm/cool material lighting.
- cobblestone.png: original diffuse ground material. Prompt: “Seamless overhead old European cobblestone texture, small irregular limestone grey/taupe/beige stones, moss in joints, neutral diffuse light, handpainted game detail, no perspective, objects or labels.”

The scene architecture, character rigs, foliage and other geometry are authored in monstrocity.scene.ts. These are first-slice models and remain below the fidelity of the approved concept. The Mossback is a sprite with procedural motion, not a fully frame-animated creature.

## Welcome hero videos (2026-10-21)

- heroes/male.mp4 and male.jpg: user-downloaded Tripo showcase `tripo-showcase-f55a5026-d738-4221-917d-e20cc180f3b5.mp4` (copy of male model eed6d7d1-49c0-4fbd-87f4-b97775ff0af8).
- heroes/female.mp4 and female.jpg: user-downloaded Tripo showcase `tripo-showcase-dd945d9e-13c0-4196-a472-d851b3c5275a.mp4`.
- Original images were generated for this project; reconstruction/showcase rendering by Tripo. Source videos remain untouched in Downloads. At the user’s request, delivery videos are cropped to the character area, excluding the embedded top attribution and upper-right QR code.
- Delivery: 390x648 portrait crop (scale source to 720x720, crop x=150, y=72, width=390, height=648) H.264/yuv420p, CRF 23, faststart, no audio. Four seconds at 30 fps; client playback rate 0.5, loop, muted, inline. JPEG posters extracted from first frame. 
- Used only on the welcome selection screen. These are turntable videos, not GLB models or gameplay rigs. Reduced-motion users get posters; hidden pages pause playback.

## Combat art — fixed-view rig, 2026-10-22

- Active monster texture: `monster-rig.png`, generated with built-in imagegen from the original Mossback and Twigwalker designs. One frontal neutral painting per species, side by side, transparent background. Original output: `exec-d8d7226a-cbcb-4774-92e6-b526dca3a8fc.png` in the Codex generated-images directory.
- Both earlier `*-walk.png` atlases are superseded and no longer loaded by combat. They had inconsistent camera angles between independently generated poses.
- `monstrocity-gait.ts` deforms a textured mesh using eight cyclic gait keys. Legs are offset by four phases; arms counter-swing. The head/torso have no yaw, horizontal translation, mirroring or frame replacement. Cubic interpolation preserves motion across the 8 → 1 boundary. Cycle lengths: Mossback 1.44 s, Twigwalker 1.16 s.
- `throw-hand.png` remains the six-pose 3×2 right-hand/forearm atlas, explorer sleeve, stone windup/release/follow-through, with transparent background.
- The rig texture preserves the approved painted designs rather than reverting to procedural stone/wood models. Browser comparison of all eight phases: `output/monstrocity/fixed-view-gait-review.png`.

`stone-retrieval.png`: four chronological pouch-retrieval poses, generated from the approved throw-hand art, source `exec-971f6371-c590-4677-9999-e219a510b51d.png`. Four columns on a 2172×724 transparent sheet; each cell is 543×724. Playback .72 s, fully inside the combat viewport.
