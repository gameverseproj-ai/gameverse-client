import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { WorldApi } from '../world.api';
import { World, WorldProgress } from '../../models/world.model';

const MOCK_WORLDS: World[] = [
  {
    id: 'gelly',
    name: 'Gelly World',
    description: 'A playful jelly-themed world filled with floating crystals, jelly trees, and colourful portals.',
    theme: 'fantasy',
    coverImageUrl: '',
    gameIds: ['snake', 'tetris', '2048'],
  },
  {
    id: 'neon-city',
    name: 'Neon City',
    description: 'A sprawling cyberpunk metropolis buzzing with neon light. Coming soon.',
    theme: 'cyberpunk',
    coverImageUrl: '',
    gameIds: [],
  },
  {
    id: 'pixel-realm',
    name: 'Pixel Realm',
    description: 'A retro pixel-art land from another era. Coming soon.',
    theme: 'retro',
    coverImageUrl: '',
    gameIds: [],
  },
];

const MOCK_WORLD_PROGRESS: Record<string, WorldProgress> = {
  gelly: {
    worldId: 'gelly',
    visitCount: 7,
    completedPortalIds: [],
    lastVisitedAt: new Date().toISOString(),
  },
};

@Injectable()
export class MockWorldApi implements WorldApi {
  private readonly ms = isPlatformBrowser(inject(PLATFORM_ID)) ? 350 : 0;

  getWorlds(): Observable<World[]> {
    return of(MOCK_WORLDS).pipe(delay(this.ms));
  }

  getWorldProgress(worldId: string): Observable<WorldProgress> {
    const progress: WorldProgress = MOCK_WORLD_PROGRESS[worldId] ?? {
      worldId,
      visitCount: 0,
      completedPortalIds: [],
      lastVisitedAt: null,
    };
    return of(progress).pipe(delay(this.ms));
  }
}
