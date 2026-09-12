import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { PlayerApi } from '../player.api';
import { PlayerProfile, PlayerProgress, PlayerInventory } from '../../models/player.model';
import { FIRST_USER_SEGMENT } from './snake-mock-server';

const MOCK_PROFILE: PlayerProfile = {
  segment: FIRST_USER_SEGMENT,
  id: 'player-001',
  username: 'GellyExplorer',
  avatarUrl: '',
  level: 5,
  xp: 2450,
  xpToNextLevel: 3000,
};

const MOCK_PROGRESS: PlayerProgress = {
  totalGamesPlayed: 12,
  totalScore: 4580,
  highScore: 1250,
  completedGameIds: [],
  completedWorldIds: [],
};

const MOCK_INVENTORY: PlayerInventory = {
  heroes: [
    { heroId: 'gelly-blob', worldId: 'gelly', name: 'Gelly Blob', unlockedAt: '2025-01-01T00:00:00Z' },
  ],
};

const MOCK_SELECTED_HEROES: Record<string, string> = {
  gelly: 'gelly-blob',
};

@Injectable()
export class MockPlayerApi implements PlayerApi {
  private readonly ms = isPlatformBrowser(inject(PLATFORM_ID)) ? 400 : 0;

  getProfile(): Observable<PlayerProfile> {
    return of(MOCK_PROFILE).pipe(delay(this.ms));
  }

  getProgress(): Observable<PlayerProgress> {
    return of(MOCK_PROGRESS).pipe(delay(this.ms));
  }

  getInventory(): Observable<PlayerInventory> {
    return of(MOCK_INVENTORY).pipe(delay(this.ms));
  }

  getSelectedHero(worldId: string): Observable<string> {
    return of(MOCK_SELECTED_HEROES[worldId] ?? '').pipe(delay(this.ms));
  }

  selectHero(_worldId: string, _heroId: string): Observable<void> {
    return of(undefined as void).pipe(delay(this.ms));
  }
}
