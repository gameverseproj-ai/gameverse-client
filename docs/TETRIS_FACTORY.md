# Tetris Factory

Playable at `/games/tetris`; `/games/tetris/play` redirects to it. The world portal
uses the common `GameApi.getBootstrap('tetris')` during entry, which delegates to
`TETRIS_API`. A direct visit fetches the same per-user configuration and progress.

## Gameplay

- 10×20 board, all seven tetrominoes, seeded seven-bag randomizer.
- Clockwise/counterclockwise rotation with small wall/floor kicks. This is a
  classic implementation with custom kicks, not a complete competitive SRS ruleset.
- Three-piece preview, ghost landing position, one hold per locked piece.
- Soft drop (one score point per cell), hard drop (two per cell).
- A 500 ms lock delay, at most 15 grounded lock timer resets.
- Clear 1/2/3/4 lines for 100/300/500/800 score times the level before that clear.
- Every 10 lines increases the level. Gravity starts at one row per second and
  multiplies by 0.82 per level, capped at 100 ms per row.
- One life. A blocked spawn ends the run. Blur/hidden tabs pause immediately.
- Jelly blocks, line-clear flash, level-up message and distinct rotation, landing,
  line-clear and reward sounds. The sound preference persists; reduced motion
  suppresses flashes and CSS animation.

## Server configuration

`TetrisRules` comes from the API and is stored per user in the mock database:
`columns`, `rows`, `startingLevel`, `gravityMs`, `minGravityMs`, `speedFactor`,
`linesPerLevel`, `lockDelayMs`, `maxLockResets`, `pointsPerLine`, `levelBonus`.
A run takes a snapshot of these settings. Later runs start at the user's highest
saved level. The gravity floor prevents progression becoming unplayably fast.

## API and persistence

`TETRIS_API` currently uses `MockTetrisApi`/`TetrisMockServer`. Future transport:

| Endpoint proposal | Request | Response |
| --- | --- | --- |
| GET `/api/games/tetris/bootstrap` | Authenticated user | `TetrisBootstrap` |
| POST `/api/games/tetris/runs` | Start request idempotency key | Run ID, seed, rules, segment |
| POST `/api/games/tetris/runs/:id/finish` | Clear sizes, soft/hard-drop cell counts, elapsed ms | Score, reward, balance, progress |
| PATCH `/api/games/tetris/preferences` | Sound enabled | Updated bootstrap |

The mock uses localStorage `gameverse.tetris.player-001.v1`. Configuration,
completed results, best score, highest level, total lines and balance survive
reloads on the same browser/origin. The active falling-block board does not resume
after leaving the page; progress is committed when the run ends, as in Snake.
A new start abandons an unsettled older run. Finishing twice returns the same
receipt, with no duplicate credit. Storage failure surfaces a retry UI.

The mock computes scores and rewards from its run configuration and the reported
clear history: 10 Tetris Points per line plus 50 per newly reached level by default.
A real backend must authenticate users, persist transactions and validate actual
play. Client-reported clear/drop counts are suitable for this mock, not production
anti-cheat. Nothing is synchronized across devices yet.

Metadata includes segment `jelly-pioneers`. Search `MONETIZATION_POINT` or
`tetris.run_lost` for the no-op extension hook after top-out. No ads, purchases,
extra lives or revives are implemented.

## Controls

Arrows/A/D move, Up/W/X rotates clockwise, Z rotates counterclockwise, Down/S soft
drops, Space hard drops, C/Shift holds, and P/Esc pauses. Left/right/down use a
150 ms initial repeat delay followed by 75/75/45 ms repeats. Touch buttons support
press-and-hold, pointer cancellation and simultaneous fingers.

## Checks

`node scripts/check-tetris.mjs` covers bags, rotations, walls, ghost, hold,
gravity, lock delay, four-line clears, compaction, acceleration, top-out, pause,
API persistence, reward calculation, idempotency and storage failure.
`node scripts/check-game-bootstrap.mjs` checks shared portal loading.
`npm run build` checks templates, types and server rendering.
