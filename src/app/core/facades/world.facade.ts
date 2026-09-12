import { Injectable, inject, signal } from '@angular/core';
import { WORLD_API } from '../api/world.api';
import { World, WorldProgress } from '../models/world.model';

@Injectable({ providedIn: 'root' })
export class WorldFacade {
  private readonly api = inject(WORLD_API);

  readonly worlds        = signal<World[]>([]);
  readonly currentWorld  = signal<World | null>(null);
  readonly worldProgress = signal<WorldProgress | null>(null);
  readonly loading       = signal(false);
  readonly error         = signal<string | null>(null);

  loadWorlds(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getWorlds().subscribe({
      next:  (worlds) => { this.worlds.set(worlds); this.loading.set(false); },
      error: (err)    => { this.error.set(err?.message ?? 'Failed to load worlds'); this.loading.set(false); },
    });
  }

  loadWorldById(id: string): void {
    const cached = this.worlds().find((w) => w.id === id);
    if (cached) { this.currentWorld.set(cached); return; }

    this.loading.set(true);
    this.error.set(null);
    this.api.getWorlds().subscribe({
      next: (worlds) => {
        this.worlds.set(worlds);
        this.currentWorld.set(worlds.find((w) => w.id === id) ?? null);
        this.loading.set(false);
      },
      error: (err) => { this.error.set(err?.message ?? 'Failed to load world'); this.loading.set(false); },
    });
  }

  loadWorldProgress(worldId: string): void {
    this.api.getWorldProgress(worldId).subscribe({
      next:  (p) => this.worldProgress.set(p),
      error: ()  => {},
    });
  }
}
