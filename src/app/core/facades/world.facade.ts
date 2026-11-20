import { Subscription, take, timeout } from 'rxjs';
import { Injectable, inject, signal } from '@angular/core';
import { WORLD_API, StandaloneGame } from '../api/world.api';
import { World, WorldProgress } from '../models/world.model';

@Injectable({ providedIn: 'root' })
export class WorldFacade {
  private readonly api = inject(WORLD_API);
  private worldsRequest?: Subscription;
  private standaloneRequest?: Subscription;

  readonly standalone = signal<StandaloneGame[]>([]);
  readonly standaloneError = signal(false);
  readonly worlds        = signal<World[]>([]);
  readonly currentWorld  = signal<World | null>(null);
  readonly worldProgress = signal<WorldProgress | null>(null);
  readonly loading       = signal(false);
  readonly error         = signal<string | null>(null);

  loadWorlds(): void {
    this.worldsRequest?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.standaloneError.set(false);
    this.standaloneRequest?.unsubscribe();
    this.standaloneRequest = this.api.getStandaloneGames?.().pipe(take(1), timeout(15000)).subscribe({next: games => this.standalone.set(games), error: () => {this.standalone.set([]); this.standaloneError.set(true);}});
    this.worldsRequest = this.api.getWorlds().pipe(take(1), timeout(15000)).subscribe({
      next:  (worlds) => { this.worlds.set(worlds); this.loading.set(false); },
      error: ()       => { this.error.set('Worlds could not load. Please check your connection and try again.'); this.loading.set(false); },
    });
  }

  loadWorldById(id: string): void {
    const cached = this.worlds().find((w) => w.id === id);
    if (cached) { this.currentWorld.set(cached); return; }

    this.worldsRequest?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.worldsRequest = this.api.getWorlds().pipe(take(1), timeout(15000)).subscribe({
      next: (worlds) => {
        this.worlds.set(worlds);
        this.currentWorld.set(worlds.find((w) => w.id === id) ?? null);
        this.loading.set(false);
      },
      error: () => { this.error.set('Worlds could not load. Please check your connection and try again.'); this.loading.set(false); },
    });
  }

  loadWorldProgress(worldId: string): void {
    this.api.getWorldProgress(worldId).subscribe({
      next:  (p) => this.worldProgress.set(p),
      error: ()  => {},
    });
  }
}
