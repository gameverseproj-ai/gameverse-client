import { LanguagePreference, validLanguage } from '../../models/language.model';
import { DEFAULT_MUSIC, MusicPreferences, validMusic } from '../../models/music.model';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, defer, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { PlayerApi } from '../player.api';
import { PlayerProfile, PlayerProgress, PlayerInventory } from '../../models/player.model';
import { FIRST_USER_SEGMENT } from './snake-mock-server';

const MOCK_PROFILE: PlayerProfile = {
  language: 'en',
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
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly ms = this.browser ? 400 : 0;
  private language: LanguagePreference = {language: 'en'};
  private readonly languageKey = `gameverse.player.${MOCK_PROFILE.id}.language.v1`;
  getLanguagePreference(): Observable<LanguagePreference> {
    return defer(() => {
      const raw = this.browser ? localStorage.getItem(this.languageKey) : null;
      const saved = raw ? JSON.parse(raw) : this.language;
      if (!saved || !validLanguage(saved.language)) throw new Error('Invalid language preference');
      return of({language: saved.language});
    });
  }
  saveLanguagePreference(preference: LanguagePreference): Observable<LanguagePreference> {
    return defer(() => {
      if (!preference || !validLanguage(preference.language)) throw new Error('Invalid language preference');
      const saved = {language: preference.language};
      if (this.browser) localStorage.setItem(this.languageKey, JSON.stringify(saved));
      this.language = saved;
      return of({...saved});
    });
  }
  private music = { ...DEFAULT_MUSIC };
  private readonly musicKey = `gameverse.player.${MOCK_PROFILE.id}.music.v1`;

  getMusicPreferences(): Observable<MusicPreferences> {
    return defer(() => {
      const raw = this.browser ? localStorage.getItem(this.musicKey) : null;
      const saved: unknown = raw ? JSON.parse(raw) : this.music;
      if (!validMusic(saved)) throw new Error('Could not load music preferences.');
      return of({ ...saved });
    });
  }

  saveMusicPreferences(preferences: MusicPreferences): Observable<MusicPreferences> {
    return defer(() => {
      if (!validMusic(preferences)) throw new Error('Invalid music preferences.');
      const saved = { ...preferences };
      if (this.browser) localStorage.setItem(this.musicKey, JSON.stringify(saved));
      this.music = saved;
      return of({ ...saved });
    });
  }

  getProfile(): Observable<PlayerProfile> {
    return this.getLanguagePreference().pipe(map(({language}) => ({...MOCK_PROFILE, language})), delay(this.ms));
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
