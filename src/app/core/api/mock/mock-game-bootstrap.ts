import { GameBootstrap } from '../../models/game-bootstrap.model';

const responses: Record<string, GameBootstrap> = {
  power: {
    schemaVersion: 1, gameId: 'power', playerId: 'player-001',
    progress: { gamesPlayed: 3, bestScore: 120, state: { strengthLevel: 2, completedChallenges: ['warmup'] } },
    settings: { soundEnabled: true, musicEnabled: true, rules: { difficulty: 'normal', roundSeconds: 60 } },
  },
};

export function mockGameBootstrap(gameId: string): GameBootstrap {
  const response = responses[gameId];
  if (!response) throw new Error('Game is unavailable');
  // Each request behaves like a separate JSON response, without shared mutable fixtures.
  return JSON.parse(JSON.stringify(response));
}
