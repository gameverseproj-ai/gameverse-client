/** Procedural game effects; created only after a user gesture. */
export class PowerAudio {
  private context?: AudioContext;
  enabled = true;
  unlock(): void {
    if (!this.enabled) return;
    try { this.context ??= new AudioContext(); void this.context.resume().catch(() => {}); } catch { /* Sound is optional on unsupported browsers. */ }
  }
  private tone(from: number, to: number, duration: number, volume: number, delay = 0): void {
    const ctx = this.context; if (!this.enabled || !ctx || ctx.state !== 'running') return;
    const oscillator = ctx.createOscillator(), gain = ctx.createGain(), start = ctx.currentTime + delay;
    oscillator.frequency.setValueAtTime(from, start); oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
    gain.gain.setValueAtTime(.001, start); gain.gain.linearRampToValueAtTime(volume, start + .015); gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(start); oscillator.stop(start + duration);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  private noise(duration: number, frequency: number, volume: number): void {
    const ctx = this.context; if (!this.enabled || !ctx || ctx.state !== 'running') return;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = frequency; gain.gain.value = volume;
    source.connect(filter); filter.connect(gain); gain.connect(ctx.destination); source.start();
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  pull(): void { this.tone(90, 140, .15, .04); }
  swing(): void { this.noise(.18, 2200, .13); }
  hit(power: number): void { this.noise(.2, 700, .2); this.tone(135, 38, .25, .15 + power * .1); }
  rep(exercise: number): void {
    this.noise(.28, 450, .1); this.tone(120, 65, .2, .08);
    if (exercise === 0) { this.tone(600, 220, .12, .05, .35); this.tone(440, 180, .15, .04, .42); }
    if (exercise === 1) this.tone(85, 35, .16, .12, .45);
    if (exercise === 2) { this.noise(.18, 1800, .12); this.tone(150, 65, .13, .08, .32); }
  }
  reward(): void { [440, 554, 659, 880].forEach((note, i) => this.tone(note, note, .22, .065, i * .1)); }
  gym(): void { [220, 330, 440].forEach((note, i) => this.tone(note, note, .15, .035, i * .13)); }
  close(): void { void this.context?.close().catch(() => {}); }
}
