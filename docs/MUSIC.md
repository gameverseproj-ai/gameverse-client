# Account music

The account soundtrack offers Rock, Pop, Funk, and Off. These are nine original synthesized eight-bar instrumental arrangements (three per genre), not recorded or licensed songs. Music defaults to off. Volume and the last selected genre are retained when switched off; game sound effects remain independent.

`PlayerApi.getMusicPreferences()` and `saveMusicPreferences()` exchange `MusicPreferences { enabled, genre, volume }`. `MockPlayerApi` persists this in the current mock player's local storage namespace. This is local persistence, not cross-device account synchronization. A future authenticated backend should derive the account from the session and store the same preference contract.

The root `MusicService` owns a single `MusicPlayer`. Completed game entry, exit and game-to-game navigation selects a new tune in the current genre. Query/hash changes, in-game subroutes and non-game navigation do not rotate music. A per-genre shuffle bag plays every theme before refilling and prevents consecutive repeats. Navigation does not enable muted music. Controls are available in the navigation, over full-screen games, and on Profile. Music begins only after browser audio activation; a Play music button is shown when activation is pending. Hidden documents stop scheduling and resume when visible and permitted. Switching genres fades/stops the old sources. Timers and audio nodes are released on stop/destruction. Schedulers run outside Angular change detection.

The arrangements in `core/audio/music-score.ts` separate composition from playback. Rock uses power-chord riffs, pop uses a major-key progression and melody, and funk uses syncopated bass, short chords and swung percussion. Production audio recordings can replace `MusicPlayer` without changing account preferences or UI.

Verification: `node scripts/check-music.mjs` checks API persistence, silent defaults, validation, storage errors, distinct score loops, activation gating, player lifecycle, shuffle boundaries and actual service/router integration. `npm run build` verifies the application and server render.

## Themes

- Rock: Neon Run (116 BPM), Velvet Voltage (124 BPM), Afterglow Drive (108 BPM).
- Pop: Candy Skyline (112 BPM), Satellite Hearts (120 BPM), Daydream Arcade (102 BPM).
- Funk: Jelly Strut (104 BPM), Pocket Rocket (112 BPM), Midnight Bounce (98 BPM).

Themes have separate harmonic progressions, melodic hooks and/or rhythmic patterns. The music panel displays the selected theme and tempo. Rotation history is session-local; a fresh page load starts a new shuffled selection.
