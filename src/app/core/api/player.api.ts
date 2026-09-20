import { MusicPreferences } from '../models/music.model';
import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { PlayerProfile, PlayerProgress, PlayerInventory } from '../models/player.model';

export interface PlayerApi {
  getMusicPreferences(): Observable<MusicPreferences>;
  saveMusicPreferences(preferences: MusicPreferences): Observable<MusicPreferences>;
  getProfile(): Observable<PlayerProfile>;
  getProgress(): Observable<PlayerProgress>;
  getInventory(): Observable<PlayerInventory>;
  /** Returns the heroId selected for a given world. */
  getSelectedHero(worldId: string): Observable<string>;
  selectHero(worldId: string, heroId: string): Observable<void>;
}

export const PLAYER_API = new InjectionToken<PlayerApi>('PLAYER_API');
