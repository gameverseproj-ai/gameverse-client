# Account music

The account soundtrack offers Rock (116 BPM), Pop (112 BPM), Funk (104 BPM), and Off. These are original synthesized eight-bar instrumental arrangements, not recorded or licensed songs. Music defaults to off. Volume and the last selected genre are retained when switched off; game sound effects remain independent.

`PlayerApi.getMusicPreferences()` and `saveMusicPreferences()` exchange `MusicPreferences { enabled, genre, volume }`. `MockPlayerApi` persists this in the current mock player's local storage namespace. This is local persistence, not cross-device account synchronization. A future authenticated backend should derive the account from the session and store the same preference contract.

The root `MusicService` owns a single `MusicPlayer` across route changes. Controls are available in the navigation, over full-screen games, and on Profile. Music begins only after browser audio activation; a Play music button is shown when activation is pending. Hidden documents stop scheduling and resume when visible and permitted. Switching genres fades/stops the old sources. Timers and audio nodes are released on stop/destruction. Schedulers run outside Angular change detection.

The arrangements in `core/audio/music-score.ts` separate composition from playback. Rock uses power-chord riffs, pop uses a major-key progression and melody, and funk uses syncopated bass, short chords and swung percussion. Production audio recordings can replace `MusicPlayer` without changing account preferences or UI.

Verification: `node scripts/check-music.mjs` checks API persistence, silent defaults, validation, storage errors, distinct score loops, activation gating and player lifecycle. `npm run build` verifies the application and server render.
