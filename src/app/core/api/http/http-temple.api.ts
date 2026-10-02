import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TempleApi } from '../temple.api';
import { TempleBootstrap, TempleMove } from '../../models/temple.model';
import { API_BASE_URL } from './api-config';

@Injectable({ providedIn: 'root' })
export class HttpTempleApi implements TempleApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  getBootstrap(): Observable<TempleBootstrap> {
    return this.http.get<TempleBootstrap>(`${this.base}/api/games/2048/bootstrap`);
  }

  /** Resumes an unfinished run rather than starting a second one. */
  startRun(requestId: string): Observable<TempleBootstrap> {
    return this.http.post<TempleBootstrap>(`${this.base}/api/games/2048/runs`, { requestId });
  }

  /** The board and score come back from the server; only the direction is sent. */
  move(request: TempleMove): Observable<TempleBootstrap> {
    return this.http.post<TempleBootstrap>(
      `${this.base}/api/games/2048/runs/${encodeURIComponent(request.runId)}/moves`, request);
  }
}
