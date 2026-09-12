# Gelly World runtime art

Visual direction: `gelly-world-target-v2-assets.png`. The original reference images and high-resolution sculpt models are preserved.

## Implemented

- Articulated pink jelly hero with clearcoat, a top jelly bead, eyes and highlights, cheeks, curved smile, arms and feet.
- Idle breathing and blinking; blended walk/run gait; smooth turning; jump anticipation, airborne stretch and landing squash; a wave; proximity halo and altitude-responsive contact shadow.
- WASD/arrows move, Shift sprints, Space jumps, Q waves, E enters a nearby hall. On-screen buttons support touch. Hold anywhere on the play surface for 300 ms to create a floating joystick, then drag to move; release or cancel to remove it. Touch, mouse and pen are supported, with one pointer owning the joystick while other fingers can use action buttons. Hero view switches to a close camera.
- All four sculpted halls: Snake Hall, 2048 Temple, Tetris Factory and Power Gym, with coordinated vertex colors, luminous entrances and colored paths.
- Imported tree and island sculpts, faceted crystals, concentric stone plaza, twilight lighting and restrained bloom.

## Source model assessment

The supplied GLBs are untextured, single-material sculpts, roughly 0.94–1.96 million triangles and 22–47 MB each. They capture the major silhouettes but contain sculpt surface noise and lack authored material separation. They are useful source art, rather than production-ready web assets.

`node scripts/prepare-gelly-models.mjs` creates separate runtime GLBs in `public/assets/gelly/` using the installed meshoptimizer simplifier. Each hall is approximately 24,000 triangles / 0.58 MB; each prop approximately 5,000 triangles / 0.12 MB. The eight exports total approximately 2.8 MB, down from approximately 320 MB. Source files are never overwritten. A 2% positional error ceiling is specified; observed errors were below 0.5%. Runtime colors are authored in `gelly-models.ts`, since the source assets have no UVs, textures or vertex colors.

The imported crystal is exported for reuse; the live world uses lightweight procedural faceted crystal clusters for cleaner silhouette and per-hall color control.

## Validation

`node scripts/check-gelly-joystick.mjs` verifies short taps, long presses, arbitrary origins, clamped movement, pointer ownership, release and cancellation. `node scripts/check-gelly.mjs` verifies jump height and grounding, wave pose, turning, numerical stability at 30/60/120 Hz, GLB lengths, triangle budgets and file-size budgets. `npm run build` validates Angular templates, TypeScript and production routing. The two parameterized game routes and world-detail route use server rendering rather than unconfigured prerendering.

## Boundaries

This is a playable world-art implementation, not a claim of final hand-painted production art. A dedicated texture/material pass on the source sculpts would further improve local color detail, snake eyes, architectural trims and the waterfall. The hero is a procedural Three.js rig, not an exported skinned GLB. Game portals retain the existing game pages/placeholders; this work does not implement the four minigames or progression systems.
