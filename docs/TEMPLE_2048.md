# 2048 Temple

`/games/2048` is the playable game. `/games/2048/play` redirects there.
The world portal calls the shared `GameApi.getBootstrap('2048')` during entry.
That request delegates to `TEMPLE_API`; the page refreshes the same user state.

## API contract

Replace the `TEMPLE_API` provider with an HTTP implementation when a backend exists.
The current adapter is `MockTempleApi`, backed by `TempleMockServer`.
Proposed endpoints (not deployed):

| Operation | Request | Response |
| --- | --- | --- |
| GET `/api/games/2048/bootstrap` | Authenticated user | `TempleBootstrap` |
| POST `/api/games/2048/runs` | `requestId` | Updated bootstrap including run |
| POST `/api/games/2048/runs/:id/moves` | `requestId`, `runId`, `revision`, `direction` | Updated bootstrap, board, progress and balance |

The user identity belongs to the server; the mock uses `player-001` and segment
`jelly-pioneers`. Each accepted move commits the board, score, progress and any
victory reward together before simulated response latency. Closing the page does
not undo an accepted move. Start resumes any unfinished run. A completed run stays
visible until the player starts the next one.

Moves are serialized by the UI with one buffered direction. The last command ID
is persisted; retrying it returns the saved response without spawning again or
crediting twice. Other stale revisions are rejected. The error screen can retry
an uncertain request or refresh state if another tab advanced the game.

## Difficulty and rewards

The server stores a per-user level catalogue in `settings.rules.levels`.
Each new run receives an immutable copy of that level configuration:

- `gridSize`: square board width (default 4).
- `targetTile`: tile required for victory.
- `initialTiles`: starting tile count (default 2).
- `fourChance`: probability of a new 4 rather than 2.
- `winPoints`: Temple Points credited on victory.
- `id` and `name`: progression and presentation metadata.

Eight initial levels target 128, 256, 512, 1024, 2048, 4096, 8192 and 16384.
The chance of spawning 4 rises from 10% by 2.5 percentage points per level.
Rewards rise from 100 to 800 Temple Points. A win unlocks the next level; the
last level is repeatable. A loss keeps the same level and awards no points.
Tile merge score is separate from the persistent Temple Points balance.
The server computes both; the client sends directions, never a claimed score.

## Persistence and limitations

The mock database uses localStorage `gameverse.temple.player-001.v1`. This includes
level configuration, board, run revision, progression and balance. Data survives
reloads in the same browser/origin. It is not shared across devices, and local
storage is not a trusted production authority. A real backend must persist these
transactions under authenticated users and enforce concurrency atomically.
Storage errors are surfaced rather than silently claiming a result is saved.

## Controls and presentation

Arrows/WASD, on-screen arrows and touch swipes move tiles. Equal tiles combine
once per move; only a changed board spawns a tile. The game ends at the configured
target or when no legal moves remain. Esc/blur pauses interaction, and returning
requires Continue. Winning shows the confirmed reward with a small celebration
and optional browser audio; reduced-motion preferences suppress animations.

## Verification

- `node scripts/check-temple.mjs`: merge rules, all directions, spawning, losses,
  persistence, custom server configuration, retry/stale writes, rewards and storage errors.
- `node scripts/check-game-bootstrap.mjs`: shared world bootstrap API integration.
- `npm run build`: TypeScript, Angular templates and server rendering.

Tile movement uses source/destination mappings from the same merge engine as the
mock server. After a confirmed move, old tiles glide for 180 ms; merged tiles pop
and new tiles appear. The input queue waits for that transition before the next
move. Reduced motion skips gliding and popping. Slide, merge and victory sounds
are distinct; the in-game sound button mutes effects for the current visit.
