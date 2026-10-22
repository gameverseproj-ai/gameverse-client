import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { World, WorldProgress } from '../models/world.model';

export interface StandaloneGame { id: string; title: string; launchRoute: string; thumbnailUrl: string; }

export interface WorldApi {
  getStandaloneGames?(): Observable<StandaloneGame[]>;
  getWorlds(): Observable<World[]>;
  getWorldProgress(worldId: string): Observable<WorldProgress>;
}

export const WORLD_API = new InjectionToken<WorldApi>('WORLD_API');
