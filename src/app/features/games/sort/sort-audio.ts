/** Short, softly enveloped glass chimes; unlocked only by a user gesture. */
export class SortAudio {
  private context?: AudioContext;
  unlock(): void {
    try { this.context ??= new AudioContext(); void this.context.resume().catch(() => {}); } catch { /* Optional audio. */ }
  }
  celebrate(victory: boolean): void {
    const context = this.context;
    if (!context || context.state !== 'running') return;
    const notes = victory ? [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98] : [783.99, 1046.5, 1318.51];
    notes.forEach((frequency, i) => {
      const start = context.currentTime + i * (victory ? .13 : .09);
      const oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(victory ? .065 : .045, start + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, start + .65);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(start); oscillator.stop(start + .7);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  }
  mute(): void { if (this.context) void this.context.suspend().catch(() => {}); }
  destroy(): void { if (this.context) void this.context.close().catch(() => {}); }
}
