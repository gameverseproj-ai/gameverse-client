# Jelly Snake

Play at `/games/snake`. `/games/snake/play` redirects there. The Snake Hall portal
loads `GameApi.getBootstrap('snake')` when entry begins; the mock delegates to
`SnakeApi.getBootstrap()`. A direct page visit loads the same data.

## Rules and progression

The server owns difficulty, reward values, and progress. Each run receives its
level configuration from `startRun`: a 16×16 board, one life, starting interval,
minimum interval, acceleration amount and collection cadence, victory length and clear bonus.
Walls and the snake's body end the run. Moving into a vacating tail cell is legal.
Reversal is blocked; up to two turns can be buffered. Pausing or leaving the tab
stops the clock. There is no revive or second life.

A run continues without short rounds or length resets. Victory requires a snake
occupying a quarter of the board: 64 cells on a 16×16 board (61 pickups from an
initial length of 3). Reaching that length unlocks the next pace profile. Later
profiles start faster; the victory length remains tied to board area. A loss retains the current
level. All collected objects award Snake Points even on a lost run; a clear adds
the level bonus. The balance has no conversion or spending mechanism yet.

Miniatures: temple, factory, gym, crystal, tree, floating island. They are drawn
with Canvas in the Jelly palette. Effects can be muted; the preference is saved.

## Mock server and future endpoints

`SNAKE_API` is bound to `MockSnakeApi` in `app.config.ts`. The proposed transport:

| Method | Proposed endpoint | Input |
| --- | --- | --- |
| Bootstrap | GET `/api/games/snake/bootstrap` | Authenticated user |
| Start | POST `/api/games/snake/runs` | `requestId` idempotency key |
| Finish | POST `/api/games/snake/runs/:id/finish` | Outcome, collected item IDs, elapsed ms |
| Preferences | PATCH `/api/games/snake/preferences` | Sound/music preferences |

These are interface proposals, not a deployed server. The mock computes points
from its own item catalogue and atomically saves the receipt, balance and progress.
Retrying a finish returns the original receipt without crediting it twice. Retrying
an uncertain start uses the same request ID. A new run abandons an unfinished one.

The mock database is browser localStorage at `gameverse.snake.player-001.v1`.
Completed runs and settings survive reloads on the same browser/origin. Live board
state does not resume after closing the page, and unfinished runs earn no points.
Nothing is synchronized across devices. Storage failures are surfaced to the UI.
Server operations commit before the simulated response delay, so an accepted
result survives navigation before the acknowledgement arrives.

A real backend must derive user identity from authentication, persist the data in
a database and validate gameplay/rewards authoritatively. The client-reported
collection list is suitable for this mock, not production anti-cheat. Run receipts
are retained in this prototype; a production backend needs retention and concurrency
policies. No real network calls, purchases or ad services are connected.

## User metadata and monetization

Initial segment: `jelly-pioneers`. It is included in PlayerProfile, snake bootstrap,
and run metadata, without changing gameplay or displaying it to the player.

Search for **`MONETIZATION_POINT`** to find extension hooks. The first one is
**`snake.run_lost`**, called once on a lethal collision, before result settlement,
with game ID, run ID, segment and level. The central registry and no-op service live
in `src/app/core/monetization/monetization.service.ts`. There is no monetization UI,
ad playback, reward or additional life. Future integrations must not block saving.

## Checks

`node scripts/check-snake.mjs` checks gameplay, pause, collisions, progression,
rewards, repeated requests, persistence, preferences, metadata and storage errors.
`node scripts/check-game-bootstrap.mjs` verifies the shared portal bootstrap flow.
`npm run build` checks templates and production compilation.

## Per-user difficulty response

The bootstrap request uses the authenticated user (mock: `player-001`); no client
speed override is sent. `settings.rules.levels` returns the user's current and
upcoming levels. `startRun(requestId)` returns the authoritative `level` snapshot
for that run, so stale portal data cannot set its speed. New settings apply to new
runs; completed progress and balances are preserved.

First-level response configuration:

| Field | Value | Meaning |
| --- | --- | --- |
| `gridSize` | 16 | Square board side in cells |
| `initialLength` | 3 | Initial body length |
| `tickMs` | 600 | Milliseconds per cell (previously 230) |
| `minTickMs` | 140 | Fastest permitted interval within level |
| `speedUpEvery` | 3 | Items between speed increases |
| `speedUpMs` | 22 | Interval reduction per increase |
| `winLength` | 64 | Snake length required for victory: ceil(board area / 4) |
| `target` | 61 | Derived pickup count, retained for API compatibility |
| `bonus` | 30 | Extra Snake Points on clear |

Level starts decrease by 25 ms per unlocked level, down to 180 ms. The minimum
interval is 140 ms. In-run interval is
`max(minTickMs, tickMs - floor(collected / speedUpEvery) * speedUpMs)`.
At the 64-cell victory length the first profile reaches 160 ms per cell. These values are authored in the mock
server and consumed by the engine; replacing the API adapter preserves the flow.

Pickups show a rising sparkling points label and a two-note bell. A confirmed
reward pops into view, counts up to the credited amount, and plays a four-note
ascending melody. Sound respects the saved mute preference. Reduced-motion mode
uses a fading pickup label and an immediate final number. The displayed animation
never modifies the balance or credits rewards before the server acknowledgement.

Older completed receipts and balances remain intact. Unsettled runs started under
the old food-count contract can still submit their original result. New runs get
`winLength`; settlement checks the pickup count derived from that run snapshot.
The UI shows actual snake length rather than a short item quota.
