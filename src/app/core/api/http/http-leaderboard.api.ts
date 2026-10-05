import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Leaderboard } from '../../models/leaderboard.model';
import { API_BASE_URL } from './api-config';

@Injectable({ providedIn: 'root' })
export class HttpLeaderboardApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  get(gameId: string) {
    return this.http.get<Leaderboard>(`${this.base}/api/games/${encodeURIComponent(gameId)}/leaderboard`, { params: { limit: 50 } });
  }
}
