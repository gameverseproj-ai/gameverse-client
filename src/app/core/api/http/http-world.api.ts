import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { WorldApi, StandaloneGame } from '../world.api';
import { World, WorldProgress } from '../../models/world.model';
import { API_BASE_URL } from './api-config';

@Injectable({ providedIn: 'root' })
export class HttpWorldApi implements WorldApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  getStandaloneGames(): Observable<StandaloneGame[]> {
    return this.http.get<StandaloneGame[]>(`${this.base}/api/worlds/standalone-games`);
  }

  getWorlds(): Observable<World[]> {
    return this.http.get<World[]>(`${this.base}/api/worlds`);
  }

  getWorldProgress(worldId: string): Observable<WorldProgress> {
    return this.http.get<WorldProgress>(
      `${this.base}/api/worlds/${encodeURIComponent(worldId)}/progress`);
  }
}
