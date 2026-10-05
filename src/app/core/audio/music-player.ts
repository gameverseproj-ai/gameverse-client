import { InjectionToken } from '@angular/core';
import { MusicGenre } from '../models/music.model';
import { MUSIC_TRACKS } from './music-library';

/** One lazily created media element across routes. Only the selected recording loads. */
export class MusicPlayer {
  private audio?: HTMLAudioElement;
  private context?: AudioContext;
  private output?: GainNode;
  private source?: MediaElementAudioSourceNode;
  private selected = '';
  private revision = 0;
  private pending = false;
  onEnded = () => {};
  onReady = (_ready: boolean) => {};
  onError = (_message: string) => {};
  constructor(private readonly createAudio = () => new Audio(), private readonly createContext = () => new AudioContext()) {}

  play(genre: MusicGenre, volume: number, track = 0): void {
    try {
      if (!this.audio) {
        this.audio = this.createAudio();
        this.audio.preload = 'none';
        this.audio.onended = () => this.onEnded();
        this.audio.onerror = () => { this.pending = false; this.onReady(false); this.onError('Music could not be loaded. Try another track.'); };
        // GainNode also controls volume on iOS, where media.volume is ignored.
        this.context = this.createContext();
        this.context.onstatechange = () => this.updateReady();
        this.audio.onplaying = () => this.updateReady();
        this.audio.onpause = () => this.onReady(false);
        this.output = this.context.createGain();
        this.source = this.context.createMediaElementSource(this.audio);
        this.source.connect(this.output).connect(this.context.destination);
      }
      const url = MUSIC_TRACKS[genre][track].src;
      if (this.selected !== url) {
        this.stop();
        this.selected = url;
        this.audio.src = url;
      }
      this.output!.gain.setTargetAtTime(volume, this.context!.currentTime, .04);
      if (this.context!.state !== 'running') {
        this.onReady(false);
        void this.context!.resume().then(() => this.updateReady()).catch(() => this.onReady(false));
      }
      if (this.pending || !this.audio.paused) return;
      const revision = ++this.revision;
      this.pending = true;
      // Called synchronously inside user activation, without waiting for an API save.
      void this.audio.play().then(() => {
        if (revision !== this.revision) return;
        this.pending = false; this.updateReady(); this.onError('');
      }).catch((error: DOMException) => {
        if (revision !== this.revision) return;
        this.pending = false; this.onReady(false);
        if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') this.onError('Music could not be loaded. Try another track.');
      });
    } catch {
      this.pending = false; this.onReady(false);
      this.onError('Music could not be loaded. Try another track.');
    }
  }
  private updateReady(): void {
    this.onReady(this.context?.state === 'running' && !!this.audio && !this.audio.paused && !this.audio.ended);
  }
  stop(): void { this.revision++; this.pending = false; this.audio?.pause(); this.onReady(false); }
  destroy(): void {
    this.stop();
    if (this.audio) { this.audio.onended = null; this.audio.onerror = null; this.audio.onplaying = null; this.audio.onpause = null; this.audio.removeAttribute('src'); this.audio.load(); }
    this.source?.disconnect(); this.output?.disconnect();
    if (this.context) this.context.onstatechange = null;
    void this.context?.close();
  }
}
export const MUSIC_PLAYER = new InjectionToken<MusicPlayer>('MUSIC_PLAYER', {providedIn: 'root', factory: () => new MusicPlayer()});
