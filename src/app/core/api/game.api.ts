import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Game } from '../models/game.model';
import { GameBootstrap } from '../models/game-bootstrap.model';
import { GameSession, GameResult, FinishedGameSession } from '../models/session.model';

export interface GameApi {
  /** Proposed GET /api/games/:gameId/bootstrap; user comes from server authentication. */
  getBootstrap(gameId: string): Observable<GameBootstrap>;
  getAvailableGames(worldId: string): Observable<Game[]>;
  startGame(gameId: string): Observable<GameSession>;
  finishGame(gameId: string, result: GameResult): Observable<FinishedGameSession>;
}

export const GAME_API = new InjectionToken<GameApi>('GAME_API');
