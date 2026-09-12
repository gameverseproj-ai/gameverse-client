import { Injectable, inject, signal } from '@angular/core';
import { Observable, defer, map, take, timeout, throwIfEmpty } from 'rxjs';
import { GameBootstrap } from '../models/game-bootstrap.model';
import { tap } from 'rxjs/operators';
import { GAME_API } from '../api/game.api';
import { Game } from '../models/game.model';
import { GameSession, GameResult, FinishedGameSession } from '../models/session.model';

@Injectable({ providedIn: 'root' })
export class GameFacade {
  readonly bootstrap = signal<GameBootstrap | null>(null);

  loadBootstrap(gameId: string): Observable<GameBootstrap> {
    return defer(() => {
      this.bootstrap.set(null);
      return this.api.getBootstrap(gameId);
    }).pipe(
      timeout(10000), take(1), throwIfEmpty(() => new Error('Empty game response')),
      map(data => {
        if (data.gameId !== gameId || data.schemaVersion !== 1) throw new Error('Invalid game response');
        return data;
      }),
      tap(data => this.bootstrap.set(data)),
    );
  }
  private readonly api = inject(GAME_API);

  readonly games         = signal<Game[]>([]);
  readonly activeSession = signal<GameSession | null>(null);
  readonly loading       = signal(false);
  readonly error         = signal<string | null>(null);

  loadGames(worldId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getAvailableGames(worldId).subscribe({
      next:  (games) => { this.games.set(games); this.loading.set(false); },
      error: (err)   => { this.error.set(err?.message ?? 'Failed to load games'); this.loading.set(false); },
    });
  }

  /** Returns the observable so callers can react to the session (e.g. navigate). */
  startGame(gameId: string): Observable<GameSession> {
    return this.api.startGame(gameId).pipe(
      tap((session) => this.activeSession.set(session)),
    );
  }

  /** Returns the observable so callers can handle rewards / score display. */
  finishGame(gameId: string, result: GameResult): Observable<FinishedGameSession> {
    return this.api.finishGame(gameId, result).pipe(
      tap(() => this.activeSession.set(null)),
    );
  }
}
