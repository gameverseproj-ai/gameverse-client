import { MusicGenre } from '../models/music.model';
import { Instrument, LOOP_STEPS, MUSIC_TRACKS, MusicNote, musicStep } from './music-score';

interface ChannelSpec { gain: number; pan: number; reverb: number; delay: number; duck?: boolean }
interface Channel { input: GainNode; base: number; duck: boolean }

/** Mixer defaults per instrument; a genre may override a few of them below. */
const CHANNELS: Record<Instrument, ChannelSpec> = {
  kick:    {gain: 1,   pan: 0,    reverb: .04, delay: 0},
  snare:   {gain: .9,  pan: .04,  reverb: .22, delay: 0},
  hat:     {gain: .7,  pan: -.22, reverb: .08, delay: 0},
  openhat: {gain: .6,  pan: .25,  reverb: .12, delay: 0},
  crash:   {gain: .8,  pan: 0,    reverb: .3,  delay: 0},
  riser:   {gain: .5,  pan: 0,    reverb: .4,  delay: 0},
  bass:    {gain: .95, pan: 0,    reverb: .02, delay: 0,   duck: true},
  guitar:  {gain: .8,  pan: -.12, reverb: .12, delay: .08},
  keys:    {gain: .75, pan: .18,  reverb: .18, delay: .1,  duck: true},
  pad:     {gain: .7,  pan: 0,    reverb: .35, delay: .05, duck: true},
  lead:    {gain: .85, pan: 0,    reverb: .2,  delay: .22},
};
const GENRE_CHANNELS: Partial<Record<MusicGenre, Partial<Record<Instrument, Partial<ChannelSpec>>>>> = {
  metal:  {guitar: {gain: 1, pan: 0, reverb: .06, delay: 0}, kick: {gain: 1.1}, lead: {delay: .12}},
  trance: {guitar: {pan: .3, reverb: .18, delay: .3}, lead: {delay: .3}},
};

/** One audio clock across routes; all sources and timers are owned here. */
export class MusicPlayer {
  private context?: AudioContext;
  private output?: GainNode;
  private timer?: ReturnType<typeof setInterval>;
  private voices = new Set<AudioScheduledSourceNode>();
  private noise?: AudioBuffer;
  private impulse?: AudioBuffer;
  private drive?: Float32Array<ArrayBuffer>;
  private genre?: MusicGenre;
  private track = 0;
  private step = 0;
  private nextAt = 0;
  private channels = new Map<Instrument, Channel>();
  private graph: AudioNode[] = [];
  private reverbIn?: GainNode;
  private delayIn?: GainNode;

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
    this.buildMixer(ctx, MUSIC_TRACKS[genre][track].bpm, volume);
    const schedule = () => {
      if (ctx.state !== 'running') return;
      // Skip missed wall-clock time instead of producing a burst after a stall.
      if (this.nextAt < ctx.currentTime) this.nextAt = ctx.currentTime + .02;
      while (this.nextAt < ctx.currentTime + .12) {
        for (const note of musicStep(genre, this.step, track)) this.note(note, this.nextAt);
        this.nextAt += 60 / MUSIC_TRACKS[genre][track].bpm / 4;
        this.step = (this.step + 1) % LOOP_STEPS;
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
    const graph = this.graph; this.graph = [];
    this.channels.clear(); this.reverbIn = undefined; this.delayIn = undefined;
    if (output && this.context) {
      const now = this.context.currentTime;
      output.gain.cancelScheduledValues(now); output.gain.setTargetAtTime(0, now, .01);
      for (const voice of this.voices) { try { voice.stop(now + .05); } catch { /* Already ended. */ } }
      this.voices.clear();
      setTimeout(() => { output.disconnect(); graph.forEach(node => { try { node.disconnect(); } catch { /* Shared teardown. */ } }); }, 80);
    }
  }

  destroy(): void { this.stop(); void this.context?.close().catch(() => {}); }

  // ------------------------------------------------------------------
  // mix bus: master -> compressor, with reverb and tempo-synced delay sends
  // ------------------------------------------------------------------

  private buildMixer(ctx: AudioContext, bpm: number, volume: number): void {
    const master = ctx.createGain(); master.gain.value = 0;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -15; compressor.knee.value = 10; compressor.ratio.value = 3.5;
    compressor.attack.value = .004; compressor.release.value = .2;
    master.connect(compressor); compressor.connect(ctx.destination);
    master.gain.linearRampToValueAtTime(volume * .3, ctx.currentTime + .08);
    this.output = master;

    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulseResponse(ctx);
    this.reverbIn = ctx.createGain(); this.reverbIn.gain.value = .9;
    this.reverbIn.connect(reverb); reverb.connect(master);

    // Ping-pong delay in dotted-eighth / quarter-note time.
    const beatTime = 60 / bpm;
    const left = ctx.createDelay(2), right = ctx.createDelay(2);
    left.delayTime.value = beatTime * .75; right.delayTime.value = beatTime * .5;
    const feedLeft = ctx.createGain(), feedRight = ctx.createGain();
    feedLeft.gain.value = .3; feedRight.gain.value = .3;
    const panLeft = new StereoPannerNode(ctx, {pan: -.6}), panRight = new StereoPannerNode(ctx, {pan: .6});
    const delayOut = ctx.createGain(); delayOut.gain.value = .5;
    this.delayIn = ctx.createGain();
    this.delayIn.connect(left);
    left.connect(feedLeft); feedLeft.connect(right);
    right.connect(feedRight); feedRight.connect(left);
    left.connect(panLeft); right.connect(panRight);
    panLeft.connect(delayOut); panRight.connect(delayOut); delayOut.connect(master);

    this.graph.push(compressor, reverb, this.reverbIn, left, right, feedLeft, feedRight, panLeft, panRight, delayOut, this.delayIn);
  }

  private channel(instrument: Instrument): Channel {
    const existing = this.channels.get(instrument);
    if (existing) return existing;
    const ctx = this.context!;
    const spec = {...CHANNELS[instrument], ...GENRE_CHANNELS[this.genre!]?.[instrument]};
    const input = ctx.createGain(); input.gain.value = spec.gain;
    const pan = new StereoPannerNode(ctx, {pan: spec.pan});
    input.connect(pan); pan.connect(this.output!);
    if (spec.reverb && this.reverbIn) { const send = ctx.createGain(); send.gain.value = spec.reverb; input.connect(send); send.connect(this.reverbIn); this.graph.push(send); }
    if (spec.delay && this.delayIn) { const send = ctx.createGain(); send.gain.value = spec.delay; input.connect(send); send.connect(this.delayIn); this.graph.push(send); }
    const channel: Channel = {input, base: spec.gain, duck: !!spec.duck && this.genre === 'trance'};
    this.graph.push(input, pan);
    this.channels.set(instrument, channel);
    return channel;
  }

  /** Classic trance pump: pads, keys and bass dip on every kick. */
  private duck(at: number): void {
    for (const channel of this.channels.values()) {
      if (!channel.duck) continue;
      channel.input.gain.setValueAtTime(channel.base * .35, at);
      channel.input.gain.linearRampToValueAtTime(channel.base, at + .22);
    }
  }

  // ------------------------------------------------------------------
  // voices
  // ------------------------------------------------------------------

  private note(note: MusicNote, at: number): void {
    const ctx = this.context!;
    const start = at + (note.delay ?? 0), end = start + note.duration;
    const channel = this.channel(note.instrument);
    const frequency = 440 * Math.pow(2, (note.midi - 69) / 12);
    const velocity = note.velocity;
    const sources: AudioScheduledSourceNode[] = [];
    const nodes: AudioNode[] = [];
    let stopAt = end + .05;
    // A note's brightness scales its filter cutoff, so sections can open up.
    const cutoff = (base: number): number => note.brightness === undefined ? base : base * (.5 + note.brightness);

    const envelope = (peak: number, to: number, attack = .005): GainNode => {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(peak, start + attack);
      gain.gain.exponentialRampToValueAtTime(.0001, to);
      nodes.push(gain);
      return gain;
    };
    const burst = (filterType: BiquadFilterType, filterFrequency: number, peak: number, to: number): void => {
      const source = ctx.createBufferSource(); source.buffer = this.noiseBuffer(ctx);
      const filter = ctx.createBiquadFilter(); filter.type = filterType; filter.frequency.value = filterFrequency;
      const gain = envelope(peak, to, .001);
      source.connect(filter); filter.connect(gain); gain.connect(channel.input);
      nodes.push(filter); sources.push(source);
    };
    const osc = (type: OscillatorType, oscFrequency: number, detune = 0): OscillatorNode => {
      const oscillator = ctx.createOscillator();
      oscillator.type = type; oscillator.frequency.setValueAtTime(oscFrequency, start); oscillator.detune.value = detune;
      sources.push(oscillator);
      return oscillator;
    };

    switch (note.instrument) {
      case 'kick': {
        const [from, to, sweep] = this.genre === 'metal' ? [190, 52, .16] : this.genre === 'trance' ? [160, 48, .12] : [150, 45, .14];
        const body = osc('sine', from);
        body.frequency.exponentialRampToValueAtTime(to, start + sweep);
        body.connect(envelope(velocity, start + Math.max(note.duration, .22), .004)).connect(channel.input);
        burst('highpass', 3800, velocity * .5, start + .022); // attack click
        stopAt = start + .3;
        if (this.genre === 'trance') this.duck(start);
        break;
      }
      case 'snare': {
        burst('bandpass', 1700, velocity, start + Math.max(note.duration, .12));
        const body = osc('triangle', 185);
        body.connect(envelope(velocity * .55, start + .08, .002)).connect(channel.input);
        stopAt = start + .25;
        break;
      }
      case 'hat': case 'openhat': {
        const duration = note.instrument === 'openhat' ? Math.max(note.duration, .2) : note.duration;
        burst('highpass', 8200, velocity, start + duration);
        stopAt = start + duration + .05;
        break;
      }
      case 'crash': {
        burst('highpass', 5200, velocity, end);
        stopAt = end + .1;
        break;
      }
      case 'riser': {
        // White-noise sweep into the next section: filter and level climb together.
        const source = ctx.createBufferSource(); source.buffer = this.noiseBuffer(ctx);
        const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.Q.value = 1.2;
        filter.frequency.setValueAtTime(350, start);
        filter.frequency.exponentialRampToValueAtTime(6500, end);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(.001, start);
        gain.gain.exponentialRampToValueAtTime(velocity, end - .05);
        gain.gain.linearRampToValueAtTime(0, end);
        nodes.push(filter, gain); sources.push(source);
        source.connect(filter); filter.connect(gain); gain.connect(channel.input);
        stopAt = end + .02;
        break;
      }
      case 'bass': {
        const main = osc('sawtooth', frequency);
        const sub = osc('square', frequency / 2);
        const subGain = ctx.createGain(); subGain.gain.value = .5; nodes.push(subGain);
        const filter = ctx.createBiquadFilter(); filter.type = 'lowpass';
        filter.frequency.setValueAtTime(cutoff(this.genre === 'trance' ? 950 : 1050), start);
        filter.frequency.exponentialRampToValueAtTime(160, end);
        nodes.push(filter);
        const gain = envelope(velocity, end);
        main.connect(filter); sub.connect(subGain); subGain.connect(filter);
        if (this.genre === 'metal') {
          const shaper = ctx.createWaveShaper(); shaper.curve = this.driveCurve(); nodes.push(shaper);
          filter.connect(shaper); shaper.connect(gain);
        } else filter.connect(gain);
        gain.connect(channel.input);
        break;
      }
      case 'guitar': {
        if (this.genre === 'metal') {
          // Double-tracked distorted rhythm guitar: two takes panned hard left
          // and right, each with its own drive chain; palm-muted chugs (short
          // notes) get a darker cab. This is what makes the wall of sound wide.
          for (const [side, detune, lag] of [[-.65, -7, 0], [.65, 7, .009]] as const) {
            const voice = ctx.createOscillator();
            voice.type = 'sawtooth'; voice.frequency.setValueAtTime(frequency, start); voice.detune.value = detune;
            sources.push(voice);
            const pre = ctx.createGain(); pre.gain.value = .8;
            const shaper = ctx.createWaveShaper(); shaper.curve = this.driveCurve();
            const low = ctx.createBiquadFilter(); low.type = 'highpass'; low.frequency.value = 95;
            const cab = ctx.createBiquadFilter(); cab.type = 'lowpass'; cab.frequency.value = cutoff(note.duration <= .1 ? 1000 : 3400);
            const pan = new StereoPannerNode(ctx, {pan: side});
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, start + lag);
            gain.gain.linearRampToValueAtTime(velocity, start + lag + .005);
            gain.gain.exponentialRampToValueAtTime(.0001, end + lag);
            nodes.push(pre, shaper, low, cab, pan, gain);
            voice.connect(pre); pre.connect(shaper); shaper.connect(low); low.connect(cab); cab.connect(gain); gain.connect(pan); pan.connect(channel.input);
          }
          stopAt = end + .06;
        } else {
          const one = osc('sawtooth', frequency, -6), two = osc('sawtooth', frequency, 6);
          const gain = envelope(velocity, end);
          const filter = ctx.createBiquadFilter(); filter.type = 'lowpass';
          filter.frequency.setValueAtTime(cutoff(1900), start);
          filter.frequency.exponentialRampToValueAtTime(350, end);
          nodes.push(filter);
          one.connect(filter); two.connect(filter); filter.connect(gain);
          gain.connect(channel.input);
        }
        break;
      }
      case 'keys': {
        const main = osc('triangle', frequency), shimmer = osc('sawtooth', frequency, -12);
        const shimmerGain = ctx.createGain(); shimmerGain.gain.value = .35; nodes.push(shimmerGain);
        const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = cutoff(2600); nodes.push(filter);
        const gain = envelope(velocity, end);
        main.connect(filter); shimmer.connect(shimmerGain); shimmerGain.connect(filter); filter.connect(gain); gain.connect(channel.input);
        break;
      }
      case 'pad': {
        // Supersaw: four detuned saws with a slow swell, heavily reverberated.
        const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = cutoff(1150); nodes.push(filter);
        const gain = envelope(velocity, end, .3);
        for (const cents of [-11, -4, 4, 11]) {
          const voice = osc('sawtooth', frequency, cents);
          const trim = ctx.createGain(); trim.gain.value = .3; nodes.push(trim);
          voice.connect(trim); trim.connect(filter);
        }
        filter.connect(gain); gain.connect(channel.input);
        stopAt = end + .1;
        break;
      }
      case 'lead': {
        const main = osc('sawtooth', frequency), octave = osc('square', frequency, -7);
        const octaveGain = ctx.createGain(); octaveGain.gain.value = .4; nodes.push(octaveGain);
        const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = cutoff(3000); nodes.push(filter);
        const vibrato = osc('sine', 5.4);
        const depth = ctx.createGain(); depth.gain.value = 7; nodes.push(depth);
        vibrato.connect(depth); depth.connect(main.detune); depth.connect(octave.detune);
        const gain = envelope(velocity, end);
        main.connect(filter); octave.connect(octaveGain); octaveGain.connect(filter); filter.connect(gain); gain.connect(channel.input);
        break;
      }
    }

    for (const source of sources) { this.voices.add(source); source.start(start); source.stop(stopAt); }
    sources[0].onended = () => {
      for (const source of sources) { this.voices.delete(source); try { source.disconnect(); } catch { /* Already gone. */ } }
      for (const node of nodes) { try { node.disconnect(); } catch { /* Already gone. */ } }
    };
  }

  // ------------------------------------------------------------------
  // generated materials: noise, a reverb impulse, a distortion curve
  // ------------------------------------------------------------------

  private noiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }

  /** A 2-second exponentially decaying noise burst reads as a plate reverb. */
  private impulseResponse(ctx: AudioContext): AudioBuffer {
    if (!this.impulse) {
      const length = Math.floor(ctx.sampleRate * 2);
      this.impulse = ctx.createBuffer(2, length, ctx.sampleRate);
      for (let side = 0; side < 2; side++) {
        const data = this.impulse.getChannelData(side);
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.8);
      }
    }
    return this.impulse;
  }

  private driveCurve(): Float32Array<ArrayBuffer> {
    if (!this.drive) {
      this.drive = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) this.drive[i] = Math.tanh((i / 511.5 - 1) * 5);
    }
    return this.drive;
  }
}
