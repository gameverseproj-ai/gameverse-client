import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { SnakeBootstrap, SnakeFinishRequest, SnakePreferences, SnakeReceipt, SnakeRun } from '../models/snake.model';

export interface SnakeApi {
  getBootstrap(): Observable<SnakeBootstrap>;
  /** Idempotency key stays the same when retrying an uncertain start. */
  startRun(requestId: string): Observable<SnakeRun>;
  /** The run ID is the settlement idempotency key. Points are calculated by the server. */
  finishRun(result: SnakeFinishRequest): Observable<SnakeReceipt>;
  savePreferences(settings: SnakePreferences): Observable<SnakeBootstrap>;
}
export const SNAKE_API = new InjectionToken<SnakeApi>('SNAKE_API');
