import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { TempleBootstrap, TempleMove } from '../models/temple.model';
export interface TempleApi {
  getBootstrap(): Observable<TempleBootstrap>;
  startRun(requestId: string): Observable<TempleBootstrap>;
  move(request: TempleMove): Observable<TempleBootstrap>;
}
export const TEMPLE_API = new InjectionToken<TempleApi>('TEMPLE_API');
