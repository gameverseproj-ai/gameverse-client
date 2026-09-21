import { MusicGenre } from '../models/music.model';
import { MUSIC_TRACKS, MusicNote, musicStep } from './music-score';

/** One audio clock across routes; all sources and timers are owned here. */
export class MusicPlayer {
  private context?: AudioContext;
  private output?: GainNode;
  private timer?: ReturnType<typeof setInterval>;
  private voices = new Set<AudioScheduledSourceNode>();
  private noise?: AudioBuffer;
  private genre?: MusicGenre;
  private track = 0;
  private step = 0;
  private nextAt = 0;

  async unlock(): Promise<boolean> {
    try {
      this.context ??= new AudioContext();
      await this.context.resume();
      return this.context.state === 'running';
    } catch { return false; }
  }

  play(genre: MusicGenre, volume: number, track = 0): void {
    if (!this.context || this.context.state !== 'running') return;
    if (this.genre === genre && this.track === track && this.timer) { this.setVolume(volume); return; }
    this.stop();
    const ctx = this.context;
    this.genre = genre; this.track = track; this.step = 0; this.nextAt = ctx.currentTime + .04;
    this.output = ctx.createGain(); this.output.gain.value = 0; this.output.connect(ctx.destination);
    this.output.gain.linearRampToValueAtTime(volume * .3, ctx.currentTime + .08);
    const schedule = () => {
      if (ctx.state !== 'running') return;
      // Skip missed wall-clock time instead of producing a burst after a stall.
      if (this.nextAt < ctx.currentTime) this.nextAt = ctx.currentTime + .02;
      while (this.nextAt < ctx.currentTime + .12) {
        for (const note of musicStep(genre, this.step, track)) this.note(note, this.nextAt);
        this.nextAt += 60 / MUSIC_TRACKS[genre][track].bpm / 4;
        this.step = (this.step + 1) % 128;
      }
    };
    schedule(); this.timer = setInterval(schedule, 25);
  }

  setVolume(volume: number): void {
    if (this.context && this.output) this.output.gain.setTargetAtTime(volume * .3, this.context.currentTime, .03);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined; this.genre = undefined;
    const output = this.output; this.output = undefined;
    if (output && this.context) {
      const now = this.context.currentTime;
      output.gain.cancelScheduledValues(now); output.gain.setTargetAtTime(0, now, .01);
      for (const voice of this.voices) { try { voice.stop(now + .05); } catch { /* Already ended. */ } }
      this.voices.clear();
      setTimeout(() => output.disconnect(), 80);
    }
  }

  private note(note: MusicNote, at: number): void {
    const ctx = this.context!, output = this.output!;
    const start = at + (note.delay ?? 0), end = start + note.duration;
    const percussion = note.instrument === 'hat' || note.instrument === 'snare';
    const source = percussion ? ctx.createBufferSource() : ctx.createOscillator();
    const filter = ctx.createBiquadFilter(), envelope = ctx.createGain();
    if (source instanceof AudioBufferSourceNode) {
      if (!this.noise) {
        this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      source.buffer = this.noise;
      filter.type = 'highpass'; filter.frequency.value = note.instrument === 'hat' ? 7200 : 1500;
    } else {
      const oscillator = source as OscillatorNode;
      const frequency = 440 * Math.pow(2, (note.midi - 69) / 12);
      oscillator.type = note.instrument === 'guitar' ? 'sawtooth' : note.instrument === 'keys' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(note.instrument === 'kick' ? 130 : frequency, start);
      if (note.instrument === 'kick') oscillator.frequency.exponentialRampToValueAtTime(42, start + .13);
      filter.type = 'lowpass'; filter.frequency.setValueAtTime(note.instrument === 'guitar' ? 1900 : 3200, start);
      if (note.instrument === 'guitar' || note.instrument === 'bass') filter.frequency.exponentialRampToValueAtTime(350, end);
    }
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(note.velocity, start + .006);
    envelope.gain.exponentialRampToValueAtTime(.0001, end);
    source.connect(filter); filter.connect(envelope); envelope.connect(output);
    this.voices.add(source); source.start(start); source.stop(end + .01);
    source.onended = () => { this.voices.delete(source); source.disconnect(); filter.disconnect(); envelope.disconnect(); };
  }

  destroy(): void { this.stop(); void this.context?.close().catch(() => {}); }
}
