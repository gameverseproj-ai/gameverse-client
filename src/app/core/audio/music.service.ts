import { NavigationEnd, Router } from '@angular/router';
import { MUSIC_TRACKS } from './music-score';
import { MusicRotation } from './music-rotation';
import { DestroyRef, Injectable, NgZone, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take, timeout } from 'rxjs';
import { PLAYER_API } from '../api/player.api';
import { DEFAULT_MUSIC, MusicGenre, MusicPreferences } from '../models/music.model';
import { MusicPlayer } from './music-player';

@Injectable({providedIn: 'root'})
export class MusicService {
  private readonly router = inject(Router);
  private readonly rotation = new MusicRotation();
  private readonly tracks = signal<Record<MusicGenre, number>>({rock: this.rotation.next('rock'), pop: this.rotation.next('pop'), funk: this.rotation.next('funk')});
  readonly currentTrack = computed(() => MUSIC_TRACKS[this.preferences().genre][this.tracks()[this.preferences().genre]]);
  private readonly api = inject(PLAYER_API);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly player = new MusicPlayer();
  readonly preferences = signal<MusicPreferences>({...DEFAULT_MUSIC});
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly ready = signal(false);
  readonly error = signal('');
  private started = false;
  private disposed = false;

  /** Called after hydration; no browser globals or audio during SSR. */
  init(): void {
    if (this.started) return;
    this.started = true;
    this.rotation.visit(this.router.url);
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      if (event instanceof NavigationEnd && this.rotation.visit(event.urlAfterRedirects)) {
        const genre = this.preferences().genre;
        this.tracks.update(tracks => ({...tracks, [genre]: this.rotation.next(genre)}));
        this.sync();
      }
    });
    const unlock = () => { if (this.preferences().enabled) void this.unlock(); };
    const visibility = () => {
      if (document.hidden) this.player.stop();
      else if (this.preferences().enabled) void this.unlock();
    };
    document.addEventListener('pointerdown', unlock, {passive: true});
    document.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', visibility);
    this.destroyRef.onDestroy(() => {
      this.disposed = true;
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', visibility);
      this.player.destroy();
    });
    this.load();
  }

  load(): void {
    if (this.saving()) return;
    this.loading.set(true); this.error.set('');
    this.api.getMusicPreferences().pipe(timeout(10000), take(1), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: preferences => { this.preferences.set(preferences); this.loading.set(false); this.sync(); },
      error: () => { this.loading.set(false); this.error.set('Music settings could not be loaded. Try again.'); },
    });
  }

  choose(genre: MusicGenre): void {
    this.save({...this.preferences(), genre, enabled: true});
    // Resume in the click's user-activation window, before a future HTTP response.
    void this.unlock();
  }
  turnOff(): void { this.save({...this.preferences(), enabled: false}); }
  volume(value: number): void { this.save({...this.preferences(), volume: Math.max(0, Math.min(1, value))}); }
  async unlock(): Promise<void> {
    const ready = await this.player.unlock();
    if (this.disposed) return;
    this.ready.set(ready); this.sync();
  }
  private save(preferences: MusicPreferences): void {
    if (this.loading() || this.saving()) return;
    this.saving.set(true); this.error.set('');
    this.api.saveMusicPreferences(preferences).pipe(timeout(10000), take(1), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: saved => { this.preferences.set(saved); this.saving.set(false); this.sync(); },
      error: () => { this.saving.set(false); this.error.set('Music settings were not saved. Please try again.'); },
    });
  }
  private sync(): void {
    const p = this.preferences();
    this.zone.runOutsideAngular(() => {
      if (!p.enabled || !this.ready() || document.hidden || p.volume === 0) this.player.stop();
      else this.player.play(p.genre, p.volume, this.tracks()[p.genre]);
    });
  }
}
