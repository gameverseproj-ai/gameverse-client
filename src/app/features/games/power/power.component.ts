import { HallArtComponent } from '../../../shared/components/hall-art/hall-art.component';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { Component, HostListener, OnDestroy, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MockPowerApi } from '../../../core/api/mock/mock-power.api';
import { GameFacade } from '../../../core/facades/game.facade';
import { PowerAction, PowerState } from '../../../core/models/power.model';
import { strikeDamage, REP_TIMEOUT, localDay } from './power-engine';
import { PowerSceneComponent, PunchGesture } from './power-scene.component';
import { PowerExercise } from './power-exercises';
import { PowerTrainingComponent } from './power-training.component';
import { exerciseSeconds } from './training-rig';
import { CHALLENGERS } from './power-challengers';
import { PowerAudio } from './power-audio';
@Component({ selector: 'app-power', standalone: true, imports: [HallArtComponent, TranslatePipe, RouterLink, PowerSceneComponent, PowerTrainingComponent], templateUrl: './power.component.html', styleUrl: './power.component.scss' })
export class PowerComponent implements OnDestroy {
  private readonly api = inject(MockPowerApi);
  private readonly games = inject(GameFacade);
  readonly state = signal<PowerState | null>(null);
  readonly mode = signal<'battle' | 'machine' | 'gym'>('battle');
  readonly charging = signal(false);
  readonly position = signal(0);
  readonly impact = signal(false);
  readonly feedback = signal('Your next big hit starts here.');
  readonly error = signal('');
  readonly locked = signal(false);
  readonly exercises = signal<PowerExercise[]>([]);
  readonly now = signal(Date.now());
  private clock?: ReturnType<typeof setInterval>;
  get selectedExercise() { return this.exercises().find(e => e.index === this.exercise()); }
  selectExercise(index: number): void { if (!this.locked()) { this.exercise.set(index); this.repPulse.set(0); } }
  remaining(index: number): number { const s = this.state(); return s ? Math.min(10, Math.max(0, Math.ceil((s.repTimes[index] + REP_TIMEOUT - this.now()) / 1000))) : 0; }
  private tick(): void {
    this.now.set(Date.now()); const s = this.state(); if (!s || this.error()) return;
    if (s.day !== localDay(this.now()) || this.exercises().some(e => s.reps[e.index] > 0 && s.reps[e.index] < e.reps && this.remaining(e.index) === 0)) {
      this.load(); this.feedback.set('A 10-second pause resets an unfinished set. Start again when ready.');
    }
  }
  readonly scene = viewChild(PowerSceneComponent);
  readonly sound = signal(true);
  readonly exercise = signal(0);
  readonly repPulse = signal(0);
  readonly animationRep = signal(0);
  private readonly audio = new PowerAudio();
  private timer?: ReturnType<typeof setTimeout>;
  private strikeTimer?: ReturnType<typeof setTimeout>;
  private readonly faces = CHALLENGERS;
  constructor() { afterNextRender(() => { this.load(); this.clock = setInterval(() => this.tick(), 250); }); }
  get face() { return this.faces[((this.state()?.stage ?? 1) - 1) % this.faces.length]; }
  get maxHp() { return this.state()?.maxHp ?? 0; }
  get level() { return 1 + Math.floor(((this.state()?.strength ?? 20) - 20) / 10); }
  load(): void { this.error.set(''); this.api.getBootstrap().subscribe({ next: data => { this.exercises.set(data.settings.rules.exercises); if (!this.selectedExercise) this.exercise.set(this.exercises()[0]?.index ?? 0); this.state.set(data.progress.state); this.games.bootstrap.set(data); }, error: () => this.error.set('Could not load saved progress. Check browser storage and retry.') }); }
  switchMode(mode: 'battle' | 'machine' | 'gym'): void { this.cancel(); this.mode.set(mode); this.audio.unlock(); if (mode === 'gym') this.audio.gym(); this.feedback.set(mode === 'gym' ? 'Complete each set to permanently increase your strength.' : 'Pull down to wind up, steer your fist, then release to punch.'); if (this.state()) this.load(); }
  toggleSound(): void { this.sound.update(value => !value); this.audio.enabled = this.sound(); if (this.sound()) this.audio.unlock(); }
  grab(): void { this.audio.unlock(); this.audio.pull(); }
  strike(gesture: PunchGesture): void {
    if (!this.state() || this.locked() || this.error() || this.mode() === 'gym') return;
    const before = this.state()!, mode = this.mode() as 'battle' | 'machine';
    const hit = strikeDamage(before.strength, gesture.pull, gesture.aim, gesture.aimY);
    this.audio.unlock(); this.audio.swing(); this.locked.set(true);
    this.strikeTimer = setTimeout(() => {
      if (hit) this.audio.hit(gesture.pull);
      this.send({ type: 'hit', mode, ...gesture }, after => {
        const quality = hit === 0 ? 'Miss! Aim at the center of the dummy.' : gesture.pull > .9 && Math.abs(gesture.aim) < .15 ? 'POWER HIT!' : 'Good hit!';
        this.feedback.set(mode === 'machine' ? `${quality} ${hit * 10} points${hit * 10 > before.best ? ' · NEW RECORD!' : ''}` : after.stage > before.stage ? `${this.faceName(before.stage)} knocked out! Level ${after.stage} unlocked.` : hit ? `${quality} −${hit} HP` : quality);
        if (after.stage > before.stage || after.best > before.best) this.audio.reward();
      });
    }, 140);
  }
  private faceName(stage: number): string { return this.faces[(stage - 1) % this.faces.length].name; }
  rep(index: number): void {
    if (this.locked() || this.error() || !this.state()) return;
    this.audio.unlock(); this.animationRep.set(this.state()!.reps[index]); this.exercise.set(index); this.repPulse.update(value => value + 1); this.audio.rep(index % 3);
    this.send({ type: 'rep', exercise: index }, after => { if (after.reps[index] === this.exercises().find(e => e.index === index)!.reps) this.audio.reward(); const exercise = this.exercises().find(e => e.index === index)!; this.feedback.set(after.reps[index] === exercise.reps ? `${exercise.name} complete! +${exercise.gain} permanent strength.` : `${exercise.name}: ${after.reps[index]} / ${exercise.reps}. Keep going!`); });
  }
  private send(action: PowerAction, done: (state: PowerState) => void): void {
    this.locked.set(true);
    this.api.act(action).subscribe({ next: data => { this.exercises.set(data.settings.rules.exercises); if (!this.selectedExercise) this.exercise.set(this.exercises()[0]?.index ?? 0); this.state.set(data.progress.state); this.games.bootstrap.set(data); done(data.progress.state); this.impact.set(true); }, error: () => { this.error.set('Progress could not be saved. Check browser storage, then reload to continue.'); } });
    this.timer = setTimeout(() => { this.locked.set(false); this.impact.set(false); }, action.type === 'rep' ? exerciseSeconds(this.exercise()) * 1000 : 420);
  }
  @HostListener('window:blur') cancel(): void { this.scene()?.cancel(); this.charging.set(false); }
  @HostListener('document:visibilitychange') visibility(): void { if (document.hidden) this.cancel(); }
  ngOnDestroy(): void { this.cancel(); clearTimeout(this.timer); clearTimeout(this.strikeTimer); this.audio.close(); clearInterval(this.clock); }
}
