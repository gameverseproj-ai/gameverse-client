import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SnakeApi } from '../snake.api';
import {
  SnakeBootstrap, SnakeFinishRequest, SnakePreferences, SnakeReceipt, SnakeRun,
} from '../../models/snake.model';
import { API_BASE_URL } from './api-config';

@Injectable({ providedIn: 'root' })
export class HttpSnakeApi implements SnakeApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  getBootstrap(): Observable<SnakeBootstrap> {
    return this.http.get<SnakeBootstrap>(`${this.base}/api/games/snake/bootstrap`);
  }

  /** Retrying with the same request ID returns the original run. */
  startRun(requestId: string): Observable<SnakeRun> {
    return this.http.post<SnakeRun>(`${this.base}/api/games/snake/runs`, { requestId });
  }

  /** Settling twice replays the stored receipt without crediting again. */
  finishRun(result: SnakeFinishRequest): Observable<SnakeReceipt> {
    return this.http.post<SnakeReceipt>(
      `${this.base}/api/games/snake/runs/${encodeURIComponent(result.runId)}/finish`, result);
  }

  savePreferences(settings: SnakePreferences): Observable<SnakeBootstrap> {
    return this.http.patch<SnakeBootstrap>(`${this.base}/api/games/snake/preferences`, settings);
  }
}
