import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { GameBootstrap } from '../../models/game-bootstrap.model';
import { PowerAction, PowerState } from '../../models/power.model';
import { PowerExercise } from '../../../features/games/power/power-exercises';
import { API_BASE_URL } from './api-config';

type PowerRules = { exercises: PowerExercise[]; repTimeoutMs: number; preview: boolean };
type PowerBootstrap = GameBootstrap<PowerState, PowerRules>;

/**
 * Power Kick against be-core. Mirrors the method shape of `MockPowerApi`, which
 * is the token the gym screen injects.
 */
@Injectable({ providedIn: 'root' })
export class HttpPowerApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  /** `preview` is the test bench: the whole catalogue, kept apart from real progress. */
  getBootstrap(preview = false): Observable<PowerBootstrap> {
    return this.http.get<PowerBootstrap>(
      `${this.base}/api/games/power/bootstrap`, { params: { preview } });
  }

  resetPreview(): Observable<PowerBootstrap> {
    return this.http.post<PowerBootstrap>(`${this.base}/api/games/power/preview/reset`, null);
  }

  /** The server owns the clock, the daily assignment and the challenger's health. */
  act(action: PowerAction, preview = false): Observable<PowerBootstrap> {
    return this.http.post<PowerBootstrap>(
      `${this.base}/api/games/power/actions`, action, { params: { preview } });
  }
}
