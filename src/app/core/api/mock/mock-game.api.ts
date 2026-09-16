import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of, timer, map } from 'rxjs';
import { GameBootstrap } from '../../models/game-bootstrap.model';
import { mockGameBootstrap } from './mock-game-bootstrap';
import { MockPowerApi } from './mock-power.api';
import { TETRIS_API } from '../tetris.api';
import { TEMPLE_API } from '../temple.api';
import { SNAKE_API } from '../snake.api';
import { delay } from 'rxjs/operators';
import { GameApi } from '../game.api';
import { Game } from '../../models/game.model';
import { GameSession, GameResult, FinishedGameSession } from '../../models/session.model';

const MOCK_GAMES: Game[] = [
  { id: 'power', title: 'Power Kick', description: 'Train daily, take down cheeky punch bags and set your power record.', worldId: 'gelly', thumbnailUrl: '', engineType: 'power' },
  {
    id: 'snake',
    title: 'Snake Hall',
    description: 'Classic snake — grow as long as you can without hitting walls or yourself.',
    worldId: 'gelly',
    thumbnailUrl: '',
    engineType: 'snake',
  },
  {
    id: 'tetris',
    title: 'Tetris Factory',
    description: 'Stack falling blocks and clear lines to keep the factory running.',
    worldId: 'gelly',
    thumbnailUrl: '',
    engineType: 'tetris',
  },
  {
    id: '2048',
    title: '2048 Temple',
    description: 'Merge tiles and reach the legendary 2048 tile.',
    worldId: 'gelly',
    thumbnailUrl: '',
    engineType: '2048',
  },
];

@Injectable()
export class MockGameApi implements GameApi {
  private readonly tetris = inject(TETRIS_API);
  private readonly temple = inject(TEMPLE_API);
  private readonly snake = inject(SNAKE_API);
  private readonly power = inject(MockPowerApi);
  getBootstrap(gameId: string): Observable<GameBootstrap> {
    if (gameId === 'tetris') return this.tetris.getBootstrap();
    if (gameId === '2048') return this.temple.getBootstrap();
    if (gameId === 'snake') return this.snake.getBootstrap();
    if (gameId === 'power') return this.power.getBootstrap();
    return timer(this.ms).pipe(map(() => mockGameBootstrap(gameId)));
  }
  private readonly ms = isPlatformBrowser(inject(PLATFORM_ID)) ? 300 : 0;
  private sessionCounter = 0;

  getAvailableGames(worldId: string): Observable<Game[]> {
    const games = MOCK_GAMES.filter((g) => g.worldId === worldId);
    return of(games).pipe(delay(this.ms));
  }

  startGame(gameId: string): Observable<GameSession> {
    const session: GameSession = {
      sessionId: `session-${++this.sessionCounter}`,
      gameId,
      startedAt: new Date().toISOString(),
    };
    return of(session).pipe(delay(this.ms));
  }

  finishGame(gameId: string, result: GameResult): Observable<FinishedGameSession> {
    const finished: FinishedGameSession = {
      sessionId: `session-${this.sessionCounter}`,
      gameId,
      score: result.score,
      xpEarned: Math.floor(result.score / 10),
      coinsEarned: Math.floor(result.score / 25),
    };
    return of(finished).pipe(delay(this.ms));
  }
}
