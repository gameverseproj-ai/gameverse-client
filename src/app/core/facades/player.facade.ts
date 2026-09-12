import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { PLAYER_API } from '../api/player.api';
import { PlayerProfile, PlayerProgress, PlayerInventory } from '../models/player.model';

@Injectable({ providedIn: 'root' })
export class PlayerFacade {
  private readonly api = inject(PLAYER_API);

  readonly profile   = signal<PlayerProfile | null>(null);
  readonly progress  = signal<PlayerProgress | null>(null);
  readonly inventory = signal<PlayerInventory | null>(null);
  readonly loading   = signal(false);
  readonly error     = signal<string | null>(null);

  /** Load profile, progress, and inventory in parallel. */
  loadAll(): void {
    this.loadProfile();
    this.loadProgress();
    this.loadInventory();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getProfile().subscribe({
      next:  (p)   => { this.profile.set(p); this.loading.set(false); },
      error: (err) => { this.error.set(err?.message ?? 'Failed to load profile'); this.loading.set(false); },
    });
  }

  loadProgress(): void {
    this.api.getProgress().subscribe({
      next:  (p) => this.progress.set(p),
      error: ()  => {},
    });
  }

  loadInventory(): void {
    this.api.getInventory().subscribe({
      next:  (inv) => this.inventory.set(inv),
      error: ()    => {},
    });
  }

  getSelectedHero(worldId: string): Observable<string> {
    return this.api.getSelectedHero(worldId);
  }

  selectHero(worldId: string, heroId: string): Observable<void> {
    return this.api.selectHero(worldId, heroId);
  }
}
