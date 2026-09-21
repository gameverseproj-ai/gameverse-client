# Gelly World game verification — 2026-09-21

Checked the current local workspace, including the pending shared hall artwork
and styling changes. The application currently uses mock APIs backed by browser
storage; these checks do not validate a remote backend or a deployed site.

## Browser checks

| Game | Verified |
| --- | --- |
| Snake | Start, pause, restart, wall-collision loss, result settlement, board rendering and mobile direction controls. |
| Tetris | Start, keyboard movement/rotation, hold, hard drop, pause/resume, top-out, saved score and run count, restart screen, entry through the game catalog. |
| 2048 | Start/continue, moves, queued moves, merging and score changes, pause, exact board restoration after reload. |
| Power | Glove drag and damage, power-meter score/record, exercise animation, full eight-repetition set, permanent strength reward retained after reload. |

Returning to the 3D world and opening the game catalog worked. No JavaScript
errors appeared in the inspected browser logs.

## Issues fixed

- The new shared panels added padding and header space without reserving room
  for the controls. Adjusted the Snake, Tetris and 2048 panel size limits;
  compacted the Tetris sidebar and mobile Snake statistics. Dialog content can
  scroll on small screens instead of being clipped.
- `check-gelly.mjs` tried to read the new `ui` directory as a binary model.
  It now selects GLB files and asserts that all eight models are checked.
- `check-gelly-camera.mjs` had an outdated canvas stub without `clearRect`,
  which the localized hall signs require. Updated the stub; real Three.js
  geometry and draw-call assertions remain in place.

Viewport measurements after the layout fix (CSS pixels, active game):

| Viewport | Game | Bottom of controls |
| --- | --- | --- |
| 1280 × 720 | Tetris | 676 |
| 390 × 844 | Tetris | 794 |
| 390 × 844 | Snake | 756 |
| 390 × 844 | 2048 | 730 |

At 320 × 568, the Tetris page has no horizontal overflow and the start dialog
remains reachable. Short screens can still require vertical page scrolling.
These are browser viewport checks, not tests on physical phones.

## Automated checks

All 18 existing `scripts/check-*.mjs` programs pass, covering the four engines,
mock API persistence and retry semantics, world entry/bootstrap, camera,
movement, joystick, obstacles, steering, models, training animation, music and
translations. Victory/progression edge cases are covered by these scripts;
every level was not played to completion manually.

Reproduce from the repository root:

```sh
for f in scripts/check-*.mjs; do node "$f" || exit 1; done
```
