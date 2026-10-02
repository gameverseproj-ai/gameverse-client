import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { GameApi } from '../game.api';
import { GameBootstrap } from '../../models/game-bootstrap.model';
import { Game } from '../../models/game.model';
import { FinishedGameSession, GameResult, GameSession } from '../../models/session.model';
import { API_BASE_URL } from './api-config';

@Injectable({ providedIn: 'root' })
export class HttpGameApi implements GameApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  /** The server dispatches per game and rejects unknown IDs. */
  getBootstrap(gameId: string): Observable<GameBootstrap> {
    return this.http.get<GameBootstrap>(
      `${this.base}/api/games/${encodeURIComponent(gameId)}/bootstrap`);
  }

  getAvailableGames(worldId: string): Observable<Game[]> {
    return this.http.get<Game[]>(`${this.base}/api/worlds/${encodeURIComponent(worldId)}/games`);
  }

  startGame(gameId: string): Observable<GameSession> {
    return this.http.post<GameSession>(
      `${this.base}/api/games/${encodeURIComponent(gameId)}/sessions`, null);
  }

  /** Settles the player's open session for that game. */
  finishGame(gameId: string, result: GameResult): Observable<FinishedGameSession> {
    return this.http.post<FinishedGameSession>(
      `${this.base}/api/games/${encodeURIComponent(gameId)}/sessions/finish`, result);
  }
}
