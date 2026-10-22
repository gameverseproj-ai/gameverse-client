/** Original adaptive chamber score: bowed textures, felt keys, wood percussion and low pulses. */
export class MonstrocityMusic {
    private context?: AudioContext;
    private master?: GainNode;
    private reverb?: ConvolverNode;
    private noise?: AudioBuffer;
    private timer?: ReturnType<typeof setInterval>;
    private next = 0;
    private step = 0;
    private battle = false;
    private night = false;
    private suspended = true;
    private disposed = false;
    async start(muted: boolean) {
        if (this.disposed) return;
        if (!this.context) {
            const c = this.context = new AudioContext();
            this.master = c.createGain(); this.master.gain.value = muted ? 0 : .24;
            const compressor = c.createDynamicsCompressor();
            compressor.threshold.value = -20; compressor.ratio.value = 3;
            this.master.connect(compressor); compressor.connect(c.destination);
            this.reverb = c.createConvolver();
            const impulse = c.createBuffer(2, Math.floor(c.sampleRate * 2.8), c.sampleRate);
            for (let channel = 0; channel < 2; channel++) {
                const samples = impulse.getChannelData(channel);
                for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / samples.length, 3) * .18;
            }
            this.reverb.buffer = impulse; this.reverb.connect(this.master);
            this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
            const samples = this.noise.getChannelData(0);
            for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
            this.next = c.currentTime + .06;
            this.timer = setInterval(() => this.schedule(), 80);
        }
        this.mute(muted);
        await this.context.resume(); this.suspended = false;
    }
    setState(battle: boolean, night: boolean, paused: boolean) {
        this.battle = battle; this.night = night;
        if (!this.context || paused === this.suspended) return;
        this.suspended = paused;
        if (paused) void this.context.suspend().catch(() => {});
        else void this.context.resume().catch(() => {});
    }
    mute(muted: boolean) {
        if (this.master && this.context) this.master.gain.setTargetAtTime(muted ? 0 : .24, this.context.currentTime, .15);
    }
    private note(midi: number, time: number, duration: number, volume: number, voice: 'felt' | 'bow' | 'bass' | 'bell' = 'felt', pan = 0) {
        const c = this.context!, gain = c.createGain(), filter = c.createBiquadFilter(), stereo = c.createStereoPanner();
        const bowed = voice === 'bow';
        filter.type = 'lowpass'; filter.frequency.value = bowed ? 680 : voice === 'bass' ? 210 : 2300;
        filter.Q.value = .5; stereo.pan.value = pan;
        const attack = Math.min(duration * .3, bowed ? .7 : .015);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume, time + attack);
        gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
        filter.connect(gain); gain.connect(stereo); stereo.connect(this.master!);
        const send = c.createGain(); send.gain.value = voice === 'bass' ? .08 : .32;
        gain.connect(send); send.connect(this.reverb!);
        const oscillators: OscillatorNode[] = [];
        for (let i = 0; i < (bowed ? 2 : 1); i++) {
            const oscillator = c.createOscillator();
            oscillator.type = bowed ? 'sawtooth' : voice === 'bell' || voice === 'bass' ? 'sine' : 'triangle';
            oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
            oscillator.detune.value = bowed ? (i ? 5 : -5) : 0;
            oscillator.connect(filter); oscillator.start(time); oscillator.stop(time + duration + .03);
            oscillators.push(oscillator);
        }
        let ended = 0;
        oscillators.forEach(o => o.onended = () => {
            o.disconnect();
            if (++ended === oscillators.length) { filter.disconnect(); gain.disconnect(); stereo.disconnect(); send.disconnect(); }
        });
    }
    private percussion(time: number, low: boolean, volume: number) {
        const c = this.context!, source = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain();
        source.buffer = this.noise!;
        filter.type = 'bandpass'; filter.frequency.value = low ? 160 : 1350; filter.Q.value = low ? 1.5 : 2;
        gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(volume, time + .008);
        gain.gain.exponentialRampToValueAtTime(.0001, time + (low ? .38 : .12));
        source.connect(filter); filter.connect(gain); gain.connect(this.master!);
        source.start(time); source.stop(time + .4);
        source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    }
    private schedule() {
        const c = this.context;
        if (!c || this.suspended || c.state !== 'running') return;
        if (this.next < c.currentTime) this.next = c.currentTime + .03;
        // Sixteen bars: minor ninths, suspended answers and an unresolved dominant.
        const harmony = [[38,57,60,64],[38,53,57,62],[34,53,57,60],[41,56,60,65],
            [36,55,62,63],[34,53,60,62],[33,52,58,61],[33,55,58,64]];
        const phrases = [[74,0,69,0,72,0,76,74,0,0,69,0,65,0,67,0],
            [0,69,0,72,0,77,76,0,74,0,72,0,68,0,69,0],
            [65,0,0,69,72,0,0,74,0,72,0,69,67,0,0,0],
            [0,0,76,0,73,0,70,0,69,0,0,67,0,0,0,0]];
        while (this.next < c.currentTime + .22) {
            const bar = Math.floor(this.step / 8), beat = this.step % 8;
            const phrase = Math.floor(bar / 4) % 4, chord = harmony[Math.floor(bar / 2) % harmony.length];
            const time = this.next, unit = 60 / (this.battle ? 116 : this.night ? 70 : 78) / 2;
            if (beat === 0) {
                this.note(chord[0], time, unit * 7.8, .14, 'bass');
                if (bar % 2 === 0) chord.slice(1).forEach((n, i) => this.note(n, time + i * .045, unit * 15, .024, 'bow', (i - 1) * .45));
            }
            const pattern = this.battle ? [0,2,1,3,0,1,2,3] : phrase % 2 ? [0,-1,2,1,-1,3,-1,2] : [0,-1,1,-1,3,2,-1,1];
            const tone = pattern[beat];
            if (tone >= 0) this.note(chord[1 + tone % 3] + (tone === 3 ? 12 : 0), time, 1.5, this.battle ? .07 : .045, 'felt', beat % 2 ? .28 : -.28);
            const melody = phrases[phrase][this.step % 16];
            if (!this.battle && melody && (bar % 4 < 2 || phrase === 2)) this.note(melody - (this.night ? 12 : 0), time + .025, 2.6, .055, 'felt', .15);
            if (this.night && beat === 6 && bar % 4 === 3) this.note(chord[2] + 13, time, 3, .018, 'bell', -.5);
            if (this.battle) {
                // Tight low ostinato with an unsettled minor-second upper pedal.
                this.note(chord[0]+12,time,unit*.8,beat%2===0?.09:.055,'bow',beat%2?-.2:.2);
                if(beat===0 || beat===4) {
                    this.note(chord[3]+12,time,unit*3.8,.026,'bow',-.4);
                    if(bar%4>=2)this.note(chord[3]+13,time+.025,unit*3.5,.014,'bow',.4);
                }
                if(beat===7 && bar%2===1)this.percussion(time+unit*.5,false,.055);
                if ([0,3,4,6].includes(beat)) { this.percussion(time, true, beat === 0 ? .22 : .13); this.note(chord[0], time, .28, .09, 'bass'); }
                if (beat % 2) this.percussion(time, false, beat === 7 ? .065 : .035);
                if (bar % 4 === 3 && beat >= 6) this.note(chord[3] + 12, time, .5, .04, 'felt', -.25);
            } else if (beat === 0 || (this.night && beat === 5)) this.percussion(time, true, this.night ? .065 : .03);
            this.next += unit; this.step++;
        }
    }
    destroy() { this.disposed = true; clearInterval(this.timer); void this.context?.close().catch(() => {}); }
}
