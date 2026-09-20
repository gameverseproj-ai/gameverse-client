# Power Kick — implementation and verification

Player entry: `/games/power`. Gelly World's Power Gym portal opens this route.
Test bench: `/games/power?gym=all` opens the gym with all 60 catalog tasks, a search field, exercise selection, a repetition button and a test-only reset button.

## Daily gym

The mock API returns three stable assignments per local calendar day: selected from 60 ordinary gym and school PE activities. Each exercise has its own movement definition in `training-rig.ts`; one articulated 3D character renders all movements through `training-renderer.ts`. Limb dimensions are constant and bilateral exercises use mirrored joint targets. The catalog includes floor work, jumps, lunges, mobility, balance and weights.

Each repetition records its timestamp in the API state. At a pause of **10,000 ms or more**, an unfinished set resets to zero. The next accepted repetition begins at one. Completed sets do not expire and cannot award strength twice. The interface displays a countdown and refreshes expired sets, including after returning to a hidden tab. Reloading or changing screens does not bypass timeout checks.

The mock API rejects exercises outside the player's three daily assignments. Test mode returns all 60 and uses a separate `.preview` storage key, so test rewards and resets do not affect player progress. This is a local mock backend boundary, not a deployed authenticated server. A real backend must enforce its own clock, assignment and preview authorization.

## How to test

1. Open the test bench, choose an exercise, and click **Do rep** twice less than 10 seconds apart.
2. Wait 10 seconds. The selected set must show zero reps.
3. Complete a set with gaps under 10 seconds. Wait again: completion and strength remain.
4. Use **Do rep** to play the selected exercise.
5. Use **Reset test progress** to repeat tests, or **Open player mode** to verify that only three assignments are shown.

## Boxing

Grab either foreground glove, drag down to wind up, move sideways to aim, and release to strike with that hand. Touches outside the glove targets are ignored. Keyboard: A/D selects a hand; hold Space, aim with arrows, release Space. Escape cancels. Misses cause zero damage. Campaign health and arcade records persist separately.

Training gloves are attached to the forearm endpoint with a shared wrist transform. The training version omits the foreground glove's extra forearm, preventing floating or doubled arm segments.

## Challenger HP authority and backend handoff

`core/api/mock/power-mock-server.ts` owns challenger creation, adaptive HP, knockout progression and legacy save migration. `MockPowerApi` loads and persists this state. The shared request/response types live in `core/models/power.model.ts`.

The client submits a `PowerAction` (strike mode, pull and aim, or exercise index). It does not submit HP, maximum HP, strength or a requested level. Bootstrap and action responses return the authoritative `PowerState`, including `hp` and `maxHp`; the health bar displays those values directly. Client strike calculations are only presentation feedback and do not update progress.

On creation, maximum HP is `round(strength * 2.5 * (3.6 + 0.7 * log2(stage)))`. Each knockout creates the next challenger with at least one more maximum HP than the previous one. Maximum HP is fixed for the current challenger, so training does not heal or strengthen an active opponent. Old saves without `maxHp` preserve their remaining-health fraction during migration.

For backend integration, replace the mock API transport while retaining the request/response contract. The backend must load the player's stored strength, validate actions and atomically persist damage, knockout and successor creation. Never trust client-calculated damage or HP. The current implementation still runs locally as a mock; no server endpoint has been deployed.

## Verification

- `node scripts/check-power.mjs`: damage, progression, 60 IDs, assignments, 9999/10000 ms boundary, completed rewards, migration.
- `node scripts/check-power-api.mjs`: 3/60 API responses, assignment rejection, test isolation/reset, daily rotation, expiry.
- `node scripts/check-power-gesture.mjs`: both hands, pointer capture, release, cancellation.
- `node scripts/check-game-bootstrap.mjs`: integration with game loading.
- `npm run build`: production build; existing non-fatal CSS budget warnings remain.

Browser checks: three player assignments, test catalog/search, movement preview, attached boxing glove, and an actual 10-second reset from 1/14 to 0/14 without clicking again. Test tab reported no console errors.

Animation checks: `node scripts/check-training-motion.mjs` samples 60 motions at 201 phases, checking constant bone lengths, bilateral symmetry, finite coordinates, floor bounds and continuity. Regression checks cover planted feet, push-up alignment and palm contact, stationary curl elbows, straight leg raises and shoulder-press range. These mathematical tests supplement visual review; they do not certify exercise technique.

The gym uses a Three.js mesh character with fixed geometry, skin, clothing, small training gloves and exercise equipment. The displayed canvas receives complete frames; a software mesh projection uses the same poses if a WebGL context is unavailable. GPU resources, animation callbacks and resize observers are released when leaving the gym. Idle poses are rendered only when changed.

Training playback runs at twice its original speed: 1.2–3 seconds per repetition. Pose, camera, preview and speed controls have been removed from the game interface. Exercise selection and the repetition button remain.

Technique references used to revise the movement definitions:
- [NASM push-up](https://www.nasm.org/resource-center/exercise-library/push-up): braced torso, controlled descent and elbow direction; the page includes its demonstration video.
- [NASM jumping jacks](https://www.nasm.org/resource-center/exercise-library/jumping-jacks): coordinated arm/leg opening and landing.
- [ACE forward lunge](https://www.acefitness.org/resources/everyone/exercise-library/94/forward-lunge/): step placement, downward hip movement and return.
- [ACE glute bridge](https://www.acefitness.org/resources/everyone/exercise-library/49/glute-bridge/): grounded feet and shoulder support while lifting the pelvis.

These are authored game animations, not motion-capture recordings. References are not bundled as assets.
