import {
  Component,
  ElementRef,
  NgZone,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import {
  TENNIS_API,
  RACKETS,
  RacketId,
  TennisProfile,
  TennisRepEvent,
  TennisRoom,
  TennisSport,
  TennisTrainingChallenge,
} from './tennis.api';
import { TennisMatch, MatchState } from './tennis-match';
import { TennisScene } from './tennis-scene';

@Component({
  selector: 'app-tennis',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './tennis.component.html',
  styleUrl: './tennis.component.scss',
})
export class TennisComponent {
  readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('court');
  readonly api = inject(TENNIS_API);
  private zone = inject(NgZone);
  private route = inject(ActivatedRoute);
  readonly profile = signal<TennisProfile | null>(null);
  readonly page = signal<'club' | 'play' | 'friends' | 'gym' | 'gear' | 'cup'>(
    'club',
  );
  readonly sport = signal<TennisSport>('tennis');
  readonly room = signal<TennisRoom | null>(null);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly paused = signal(false);
  readonly copied = signal(false);
  readonly drill = signal(0);
  readonly drillDone = signal(false);
  readonly training = signal<TennisTrainingChallenge | null>(null);
  readonly drillReps = () => this.training()?.reps ?? 20;
  readonly state = signal<MatchState | null>(null);
  readonly rackets = RACKETS;
  readonly sports: { id: TennisSport; name: string; icon: string }[] = [
    { id: 'tennis', name: 'Tennis', icon: '◉' },
    { id: 'ping-pong', name: 'Ping pong', icon: '◒' },
    { id: 'squash', name: 'Squash', icon: '▣' },
    { id: 'badminton', name: 'Badminton', icon: '✧' },
  ];
  setUsername(event: Event): void {
    this.username = (event.target as HTMLInputElement).value;
  }
  username = '';
  private scene?: TennisScene;
  private match?: TennisMatch;
  private observer?: ResizeObserver;
  private frame = 0;
  private disposed = false;
  private last = 0;
  private hud = 0;
  private keys = new Set<string>();
  private recorded = false;
  private trainingLast = 0;
  private trainingStart = 0;
  private trainingLog: TennisRepEvent[] = [];
  private keydown = (e: KeyboardEvent) => {
    if (this.page() !== 'play' || (e.target as HTMLElement).matches('input,a'))
      return;
    if (e.key === ' ' && (e.target as HTMLElement).matches('button')) return;
    if (['ArrowLeft', 'ArrowRight', ' ', 'a', 'd', 'Escape'].includes(e.key)) {
      e.preventDefault();
      this.keys.add(e.key);
      if (e.key === ' ' && !e.repeat) this.hit();
      if (e.key === 'Escape') this.paused.update((v) => !v);
    }
  };
  private keyup = (e: KeyboardEvent) => this.keys.delete(e.key);
  private visibility = () => {
    if (document.hidden && this.page() === 'play') {
      this.paused.set(true);
      this.keys.clear();
    }
  };
  constructor() {
    afterNextRender(() => {
      void this.load();
      document.addEventListener('keydown', this.keydown);
      document.addEventListener('keyup', this.keyup);
      document.addEventListener('visibilitychange', this.visibility);
      this.initScene();
    });
  }
  private async load(): Promise<void> {
    await this.action(async () => {
      const p = await this.api.profile();
      if (!this.disposed) {
        this.profile.set(p);
        this.match = new TennisMatch(p);
        this.state.set({ ...this.match.state });
      }
    });
    const invite = this.route.snapshot.queryParamMap.get('invite');
    if (invite && this.api.joinByInvite && !this.disposed)
      await this.action(async () => {
        this.room.set(await this.api.joinByInvite!(invite));
        this.page.set('friends');
      });
  }
  private initScene(): void {
    try {
      this.scene = new TennisScene(this.canvas().nativeElement);
      this.observer = new ResizeObserver((entries) => {
        const { width, height } = entries[0].contentRect;
        this.scene?.resize(width, height);
      });
      this.observer.observe(this.canvas().nativeElement);
      this.zone.runOutsideAngular(
        () => (this.frame = requestAnimationFrame(this.loop)),
      );
    } catch {
      this.error.set('3D is unavailable. Please enable WebGL and reload.');
    }
  }
  private loop = (time: number) => {
    if (this.disposed) return;
    const dt = Math.min(0.035, (time - this.last) / 1000 || 0.016);
    this.last = time;
    if (this.match) {
      if (this.page() === 'play' && !this.paused()) {
        const dir =
          (this.keys.has('ArrowRight') || this.keys.has('d') ? 1 : 0) -
          (this.keys.has('ArrowLeft') || this.keys.has('a') ? 1 : 0);
        if (dir) this.match.move(this.match.state.player + dir * dt * 10);
        this.match.tick(dt);
        if (this.match.state.phase === 'finished' && !this.recorded) {
          this.recorded = true;
          this.zone.run(() => void this.record());
        }
      }
      this.scene?.render(this.match.state, time / 1000);
      if (time - this.hud > 70) {
        this.hud = time;
        this.zone.run(() => this.state.set({ ...this.match!.state }));
      }
    }
    this.frame = requestAnimationFrame(this.loop);
  };
  selectSport(id: TennisSport): void {
    this.sport.set(id);
  }
  start(): void {
    const p = this.profile();
    if (!p || this.sport() !== 'tennis') return;
    this.match = new TennisMatch(p);
    this.recorded = false;
    this.state.set({ ...this.match.state });
    this.paused.set(false);
    this.page.set('play');
  }
  hit(aim = 0, spin = 0): void {
    if (this.page() === 'play' && !this.paused()) this.match?.swing(aim, spin);
  }
  aim(event: PointerEvent): void {
    if (this.page() !== 'play' || this.paused()) return;
    const r = this.canvas().nativeElement.getBoundingClientRect();
    this.match?.move(((event.clientX - r.left) / r.width - 0.5) * 12);
  }
  touch(event: PointerEvent): void {
    this.aim(event);
    if (event.pointerType === 'touch')
      this.canvas().nativeElement.setPointerCapture(event.pointerId);
  }
  async back(): Promise<void> {
    this.paused.set(true);
    if (this.room()) await this.cancel();
    if (this.page() === 'play' && !this.recorded) {
      this.recorded = true;
      await this.record();
    }
    this.page.set('club');
    this.keys.clear();
  }
  async openRoom(invite: boolean): Promise<void> {
    await this.action(async () => {
      const room = await this.api.createRoom(
        this.sport(),
        invite ? this.username : undefined,
      );
      if (this.disposed) {
        await this.api.cancelRoom(room.id);
        return;
      }
      this.room.set(room);
      this.copied.set(false);
    });
  }
  async cancel(): Promise<void> {
    const r = this.room();
    if (r)
      await this.action(async () => {
        await this.api.cancelRoom(r.id);
        this.room.set(null);
      });
  }
  async copyInvite(): Promise<void> {
    const r = this.room();
    if (!r) return;
    await this.action(async () => {
      await navigator.clipboard.writeText(
        r.inviteUrl ??
          `${location.origin}/games/tennis?invite=${encodeURIComponent(r.id)}`,
      );
      this.copied.set(true);
    });
  }
  async equip(id: RacketId): Promise<void> {
    await this.action(async () => this.profile.set(await this.api.equip(id)));
  }
  async rep(): Promise<void> {
    const now = performance.now();
    const challenge = this.training();
    if (
      !challenge ||
      now - this.trainingLast < challenge.minIntervalMs ||
      this.busy() ||
      this.drillDone()
    )
      return;
    this.trainingLast = now;
    this.drill.update((v) => v + 1);
    this.trainingLog.push({
      sequence: this.drill(),
      elapsedMs: Math.round(now - this.trainingStart),
      action: 'rep',
    });
    if (this.drill() >= challenge.reps)
      await this.action(async () => {
        this.profile.set(await this.api.train(challenge, this.trainingLog));
        this.drillDone.set(true);
      });
  }
  async openGym(): Promise<void> {
    this.drill.set(0);
    this.drillDone.set(false);
    this.training.set(null);
    this.trainingLog = [];
    this.page.set('gym');
    await this.action(async () => {
      this.training.set(await this.api.startTraining());
      this.trainingStart = performance.now();
      this.trainingLast = 0;
    });
  }
  private async record(): Promise<void> {
    if (this.match)
      await this.action(async () =>
        this.profile.set(
          await this.api.completePractice(this.match!.state.activeSeconds),
        ),
      );
  }
  private async action(fn: () => Promise<unknown>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await fn();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Please try again');
    } finally {
      this.busy.set(false);
    }
  }
  ngOnDestroy(): void {
    if (typeof document === 'undefined') return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    this.scene?.destroy();
    document.removeEventListener('keydown', this.keydown);
    document.removeEventListener('keyup', this.keyup);
    document.removeEventListener('visibilitychange', this.visibility);
    const r = this.room();
    if (r) void this.api.cancelRoom(r.id);
  }
}
