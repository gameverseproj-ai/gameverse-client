import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TetrisApi } from '../tetris.api';
import {
  TetrisBootstrap, TetrisReceipt, TetrisResult, TetrisRun,
} from '../../models/tetris.model';
import { API_BASE_URL } from './api-config';

@Injectable({ providedIn: 'root' })
export class HttpTetrisApi implements TetrisApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  getBootstrap(): Observable<TetrisBootstrap> {
    return this.http.get<TetrisBootstrap>(`${this.base}/api/games/tetris/bootstrap`);
  }

  startRun(requestId: string): Observable<TetrisRun> {
    return this.http.post<TetrisRun>(`${this.base}/api/games/tetris/runs`, { requestId });
  }

  /** Score and reward are recomputed server-side from the reported clears. */
  finishRun(result: TetrisResult): Observable<TetrisReceipt> {
    return this.http.post<TetrisReceipt>(
      `${this.base}/api/games/tetris/runs/${encodeURIComponent(result.runId)}/finish`, result);
  }

  saveSound(enabled: boolean): Observable<TetrisBootstrap> {
    return this.http.patch<TetrisBootstrap>(
      `${this.base}/api/games/tetris/preferences`, { enabled });
  }
}
