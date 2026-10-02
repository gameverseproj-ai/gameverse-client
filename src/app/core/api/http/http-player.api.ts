import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PlayerApi } from '../player.api';
import { PlayerInventory, PlayerProfile, PlayerProgress } from '../../models/player.model';
import { LanguagePreference } from '../../models/language.model';
import { MusicPreferences } from '../../models/music.model';
import { API_BASE_URL } from './api-config';

@Injectable({ providedIn: 'root' })
export class HttpPlayerApi implements PlayerApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  getLanguagePreference(): Observable<LanguagePreference> {
    return this.http.get<LanguagePreference>(`${this.base}/api/player/language`);
  }

  saveLanguagePreference(preference: LanguagePreference): Observable<LanguagePreference> {
    return this.http.put<LanguagePreference>(`${this.base}/api/player/language`, preference);
  }

  getMusicPreferences(): Observable<MusicPreferences> {
    return this.http.get<MusicPreferences>(`${this.base}/api/player/music`);
  }

  saveMusicPreferences(preferences: MusicPreferences): Observable<MusicPreferences> {
    return this.http.put<MusicPreferences>(`${this.base}/api/player/music`, preferences);
  }

  getProfile(): Observable<PlayerProfile> {
    return this.http.get<PlayerProfile>(`${this.base}/api/player/profile`);
  }

  getProgress(): Observable<PlayerProgress> {
    return this.http.get<PlayerProgress>(`${this.base}/api/player/progress`);
  }

  getInventory(): Observable<PlayerInventory> {
    return this.http.get<PlayerInventory>(`${this.base}/api/player/inventory`);
  }

  /** The server answers with a JSON string, empty when no hero is chosen. */
  getSelectedHero(worldId: string): Observable<string> {
    return this.http.get<string>(`${this.base}/api/player/worlds/${encodeURIComponent(worldId)}/hero`);
  }

  selectHero(worldId: string, heroId: string): Observable<void> {
    return this.http.put<void>(
      `${this.base}/api/player/worlds/${encodeURIComponent(worldId)}/hero`, { heroId });
  }
}
