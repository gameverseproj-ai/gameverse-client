# Game bootstrap contract

Entering a building starts `GameApi.getBootstrap(gameId)` immediately, alongside
its portal animation. Navigation waits for both the first successful response
and animation completion. This loads data; it does not call `startGame` or create
a gameplay session.

`GameBootstrap` has a versioned common envelope: `gameId`, `playerId`,
`progress.gamesPlayed`, `progress.bestScore`, and audio preferences in `settings`.
`progress.state` and `settings.rules` are JSON payloads owned by each game. The
model accepts generic type parameters for those game-specific payloads.

The active `GAME_API` provider is `MockGameApi`. Each subscription returns an
independent JSON object with simulated latency. Snake, Tetris, 2048 and Power
have different progress and rules. Unknown game IDs fail instead of silently
receiving another game's data. Snake, 2048 Temple and Tetris use persistent mock servers described in
`SNAKE_GAME.md`, `TEMPLE_2048.md` and `TETRIS_FACTORY.md`. Power still returns illustrative progress that is not saved.

A future server adapter should implement the same method using the proposed
`GET /api/games/:gameId/bootstrap` endpoint. This endpoint is a proposal, not an
existing server contract. The server should derive the current user from its
authenticated session; the browser only supplies the game ID. Replace the
`GAME_API` provider in `app.config.ts` when the real adapter is ready.

`GameFacade.bootstrap()` retains the successful response for the destination
screen. A direct visit to a game page also loads data if the matching bootstrap
is absent. Each new portal entry fetches fresh data. Requests time out after ten
seconds. Errors offer retry or return to the world, and leaving/cancelling
unsubscribes so a late response cannot navigate the player away.
