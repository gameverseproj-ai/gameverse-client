import { NavigationEnd, Router } from '@angular/router';
import { MUSIC_TRACKS } from './music-library';
import { MusicRotation } from './music-rotation';
import { DestroyRef, Injectable, NgZone, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take, timeout } from 'rxjs';
import { PLAYER_API } from '../api/player.api';
import { DEFAULT_MUSIC, MusicGenre, MusicPreferences } from '../models/music.model';
import { MUSIC_PLAYER } from './music-player';

@Injectable({providedIn: 'root'})
export class MusicService {
  private readonly router = inject(Router);
  private readonly rotation = new MusicRotation();
  private readonly tracks = signal<Record<MusicGenre, number>>({rock: this.rotation.next('rock'), pop: this.rotation.next('pop'), funk: this.rotation.next('funk'), trance: this.rotation.next('trance'), metal: this.rotation.next('metal'), lounge: this.rotation.next('lounge')});
  readonly currentTrack = computed(() => MUSIC_TRACKS[this.preferences().genre][this.tracks()[this.preferences().genre]]);
  private readonly api = inject(PLAYER_API);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly player = inject(MUSIC_PLAYER);
  readonly preferences = signal<MusicPreferences>({...DEFAULT_MUSIC});
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly ready = signal(false);
  readonly error = signal('');
  private started = false;
  private revision = 0;
  private queued?: MusicPreferences;
  readonly playbackError = signal('');

  constructor() {
    this.player.onEnded = () => this.zone.run(() => this.nextTrack());
    this.player.onReady = ready => this.zone.run(() => this.ready.set(ready));
    this.player.onError = error => this.zone.run(() => this.playbackError.set(error));
  }

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
    const unlock = () => { if (this.preferences().enabled && !this.ready()) this.unlock(); };
    const visibility = () => {
      if (document.hidden) this.player.stop();
      else if (this.preferences().enabled) void this.unlock();
    };
    document.addEventListener('pointerdown', unlock, {passive: true});
    document.addEventListener('keydown', unlock);
    document.addEventListener('click', unlock);
    document.addEventListener('touchend', unlock, {passive: true});
    document.addEventListener('visibilitychange', visibility);
    this.destroyRef.onDestroy(() => {

      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchend', unlock);
      document.removeEventListener('visibilitychange', visibility);
      this.player.destroy();
    });
    this.load();
  }

  load(): void {
    if (this.saving()) return;
    const revision = this.revision;
    this.loading.set(true); this.error.set('');
    this.api.getMusicPreferences().pipe(timeout(10000), take(1), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: preferences => { if (revision === this.revision) this.preferences.set(preferences); this.loading.set(false); this.sync(); },
      error: () => { this.loading.set(false); this.error.set('Music settings could not be loaded. Try again.'); },
    });
  }

  choose(genre: MusicGenre): void {
    if (genre === this.preferences().genre && this.preferences().enabled) this.advance();
    this.save({...this.preferences(), genre, enabled: true});
  }
  private advance(): void {
    const genre = this.preferences().genre;
    this.tracks.update(tracks => ({...tracks, [genre]: this.rotation.next(genre)}));
  }
  nextTrack(): void { this.advance(); this.playbackError.set(''); this.sync(); }
  turnOff(): void { this.save({...this.preferences(), enabled: false}); }
  volume(value: number): void { this.save({...this.preferences(), volume: Math.max(0, Math.min(1, value))}); }
  startPlayback(): void {
    const p = this.preferences();
    this.save({...p, enabled: true, volume: p.volume > 0 ? p.volume : DEFAULT_MUSIC.volume});
  }
  unlock(): void { this.playbackError.set(''); this.sync(); }
  retry(): void {
    if (this.error() === 'Music settings could not be loaded. Try again.') this.load();
    else this.retrySave();
  }
  retrySave(): void { this.queued = {...this.preferences()}; this.flush(); }
  private save(preferences: MusicPreferences): void {
    this.revision++;
    this.preferences.set(preferences);
    this.sync();
    this.queued = preferences;
    this.flush();
  }
  /** Serialize writes, coalescing rapid changes; stale responses never reset playback. */
  private flush(): void {
    if (this.saving() || !this.queued) return;
    const preferences = this.queued;
    this.queued = undefined;
    this.saving.set(true); this.error.set('');
    this.api.saveMusicPreferences(preferences).pipe(timeout(10000), take(1), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.saving.set(false); this.flush(); },
      error: () => {
        this.saving.set(false);
        this.error.set('Music settings were not saved. Please try again.');
        this.flush();
      },
    });
  }
  private sync(): void {
    const p = this.preferences();
    this.zone.runOutsideAngular(() => {
      if (!p.enabled || document.hidden || p.volume === 0) this.player.stop();
      else this.player.play(p.genre, p.volume, this.tracks()[p.genre]);
    });
  }
}
