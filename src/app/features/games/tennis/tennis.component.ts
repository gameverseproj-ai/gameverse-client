import { TennisGearComponent } from './tennis-gear.component';
import { TennisChampionshipComponent } from './tennis-championship.component';
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
  RacketId,
  TennisBracketMatch,
  TennisChampionship,
  TennisProfile,
  TennisStandings,
  TennisTrophy,
  TennisRepEvent,
  TennisRoom,
  TennisSport,
  TennisTrainingChallenge,
} from './tennis.api';
import { TennisMatch, MatchState } from './tennis-match';
import { TennisScene } from './tennis-scene';
import {
  MatchRewards,
  RealtimeRoom,
  RealtimeStatus,
  ServerMessage,
  TennisRealtime,
} from './tennis-realtime';
import { OnlineMatch } from './tennis-online';

/** Where a networked match stands, as shown on the online court. */
export type OnlineStatus =
  | 'connecting'
  | 'waiting-opponent'
  | 'playing'
  | 'suspended'
  | 'finished';

@Component({
  selector: 'app-tennis',
  standalone: true,
  imports: [RouterLink, TranslatePipe, TennisGearComponent, TennisChampionshipComponent],
  templateUrl: './tennis.component.html',
  styleUrl: './tennis.component.scss',
})
export class TennisComponent {
  readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('court');
  readonly api = inject(TENNIS_API);
  private zone = inject(NgZone);
  private route = inject(ActivatedRoute);
  readonly profile = signal<TennisProfile | null>(null);
  readonly page = signal<
    'club' | 'play' | 'online' | 'friends' | 'gym' | 'gear' | 'cup'
  >('club');
  readonly sport = signal<TennisSport>('tennis');
  readonly room = signal<TennisRoom | null>(null);
  readonly courts = signal<TennisRoom[]>([]);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly paused = signal(false);
  readonly copied = signal(false);
  readonly drill = signal(0);
  readonly drillDone = signal(false);
  readonly training = signal<TennisTrainingChallenge | null>(null);
  readonly drillReps = () => this.training()?.reps ?? 20;
  readonly state = signal<MatchState | null>(null);
  /** Networked match: connection, readiness and the result. */
  readonly onlineStatus = signal<OnlineStatus>('connecting');
  readonly link = signal<RealtimeStatus>('idle');
  readonly readySent = signal(false);
  readonly opponentReady = signal(false);
  readonly opponentName = signal('');
  readonly serving = signal(false);
  readonly toast = signal('');
  readonly rewards = signal<MatchRewards | null>(null);
  readonly reconnectDeadline = signal('');
  /** The live-ops season, if one is on; null hides the championship entirely. */
  readonly championship = signal<TennisChampionship | null>(null);
  readonly standings = signal<TennisStandings | null>(null);
  readonly trophies = signal<TennisTrophy[]>([]);
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
  private online?: OnlineMatch;
  private realtime?: TennisRealtime;
  private subscribedRoom = '';
  private observer?: ResizeObserver;
  private frame = 0;
  private disposed = false;
  private last = 0;
  private hud = 0;
  private lastInput = 0;
  private toastTimer = 0;
  private championshipTimer = 0;
  private championshipLoading = false;
  private keys = new Set<string>();
  private recorded = false;
  private trainingLast = 0;
  private trainingStart = 0;
  private trainingLog: TennisRepEvent[] = [];
  private keydown = (e: KeyboardEvent) => {
    const onCourt = this.page() === 'play' || this.page() === 'online';
    if (!onCourt || (e.target as HTMLElement).matches('input,a')) return;
    if (e.key === ' ' && (e.target as HTMLElement).matches('button')) return;
    if (['ArrowLeft', 'ArrowRight', ' ', 'a', 'd', 'Escape'].includes(e.key)) {
      e.preventDefault();
      this.keys.add(e.key);
      if (e.key === ' ' && !e.repeat) this.hit();
      if (e.key === 'Escape' && this.page() === 'play')
        this.paused.update((v) => !v);
    }
  };
  private keyup = (e: KeyboardEvent) => this.keys.delete(e.key);
  private visibility = () => {
    if (!document.hidden) void this.loadChampionship();
    if (document.hidden && this.page() === 'play') {
      this.paused.set(true);
      this.keys.clear();
    }
  };
  constructor() {
    afterNextRender(() => {
      void this.load();
      this.championshipTimer = window.setInterval(() => {
        if (!document.hidden) void this.loadChampionship();
      }, 60_000);
      document.addEventListener('keydown', this.keydown);
      document.addEventListener('keyup', this.keyup);
      document.addEventListener('visibilitychange', this.visibility);
      this.initScene();
    });
  }
  get onlineEnabled(): boolean {
    return !this.api.mock && !!this.api.realtimeTicket;
  }
  get me(): string | null {
    return this.realtime?.playerId ?? this.api.playerId?.() ?? null;
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
    void this.loadChampionship();
    const invite = this.route.snapshot.queryParamMap.get('invite');
    if (invite && this.api.joinByInvite && !this.disposed)
      await this.action(async () => {
        this.setRoom(await this.api.joinByInvite!(invite));
        this.page.set('friends');
      });
    else if (this.api.currentRoom && !this.disposed)
      // A reloaded page picks its court back up; a running match re-enters on Play.
      await this.action(async () => {
        const room = await this.api.currentRoom!();
        if (room && !this.disposed) {
          this.setRoom(room);
          this.page.set('friends');
        }
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
    const dir =
      (this.keys.has('ArrowRight') || this.keys.has('d') ? 1 : 0) -
      (this.keys.has('ArrowLeft') || this.keys.has('a') ? 1 : 0);
    if (this.page() === 'online' && this.online) {
      const online = this.online;
      if (dir) online.move(online.state.player + dir * dt * 10);
      online.tick(time, dt);
      // Inputs go out at 30 Hz while the match runs; the swing rides the next frame.
      if (
        this.onlineStatus() === 'playing' &&
        time - this.lastInput >= 33 &&
        this.realtime?.status === 'open'
      ) {
        this.lastInput = time;
        this.realtime.send({
          type: 'match.input',
          matchId: online.matchId,
          ...online.nextFrame(),
        });
      }
      this.scene?.render(online.state, time / 1000);
      if (time - this.hud > 70) {
        this.hud = time;
        this.zone.run(() => {
          this.state.set({ ...online.state });
          this.serving.set(online.serving);
        });
      }
    } else if (this.match) {
      if (this.page() === 'play' && !this.paused()) {
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
    if (this.page() === 'online') this.online?.swing(aim, spin);
    else if (this.page() === 'play' && !this.paused())
      this.match?.swing(aim, spin);
  }
  aim(event: PointerEvent): void {
    const r = this.canvas().nativeElement.getBoundingClientRect();
    const x = ((event.clientX - r.left) / r.width - 0.5) * 12;
    if (this.page() === 'online') this.online?.move(x);
    else if (this.page() === 'play' && !this.paused()) this.match?.move(x);
  }
  touch(event: PointerEvent): void {
    this.aim(event);
    if (event.pointerType === 'touch')
      this.canvas().nativeElement.setPointerCapture(event.pointerId);
  }
  async back(): Promise<void> {
    this.paused.set(true);
    if (this.page() === 'online') {
      this.leaveOnline();
    } else if (this.room()) await this.cancel();
    if (this.page() === 'play' && !this.recorded) {
      this.recorded = true;
      await this.record();
    }
    this.page.set('club');
    this.keys.clear();
  }

  // ------------------------------------------------------------------
  // courts: creating, listing, joining
  // ------------------------------------------------------------------

  async openFriends(): Promise<void> {
    this.page.set('friends');
    await this.refreshCourts();
  }
  async refreshCourts(): Promise<void> {
    if (!this.api.listRooms) return;
    try {
      const rooms = await this.api.listRooms(this.sport());
      const mine = this.room()?.id;
      this.courts.set(rooms.filter((r) => r.id !== mine));
    } catch {
      /* The list is a convenience; creating a court still works. */
    }
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
      this.setRoom(room);
      this.copied.set(false);
    });
  }
  async joinCourt(id: string): Promise<void> {
    if (!this.api.joinRoom) return;
    await this.action(async () => {
      this.setRoom(await this.api.joinRoom!(id));
    });
  }
  async cancel(): Promise<void> {
    const r = this.room();
    if (r)
      await this.action(async () => {
        await this.api.cancelRoom(r.id);
        this.clearRoom();
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
  /** Whether the court has its second player and a match waiting to start. */
  roomReady(): boolean {
    const r = this.room();
    return (
      !!r?.matchId &&
      (r.serverStatus === 'ready' || r.serverStatus === 'playing')
    );
  }
  private setRoom(room: TennisRoom): void {
    this.room.set(room);
    this.readySent.set(false);
    this.opponentReady.set(false);
    if (this.onlineEnabled) void this.watchRoom(room.id);
  }
  private clearRoom(): void {
    this.room.set(null);
    this.subscribedRoom = '';
    this.readySent.set(false);
    this.opponentReady.set(false);
  }

  // ------------------------------------------------------------------
  // the networked match
  // ------------------------------------------------------------------

  private async ensureRealtime(): Promise<TennisRealtime> {
    if (this.realtime && this.realtime.status !== 'closed')
      return this.realtime;
    const realtime = new TennisRealtime(
      () => this.api.realtimeTicket!(),
      (url, ticket) => this.api.realtimeUrl!(url, ticket),
      (message) => this.zone.run(() => this.onMessage(message)),
      (status) => this.zone.run(() => this.onLink(status)),
    );
    this.realtime = realtime;
    await realtime.connect();
    return realtime;
  }
  private async watchRoom(roomId: string): Promise<void> {
    try {
      const realtime = await this.ensureRealtime();
      this.subscribedRoom = roomId;
      realtime.send({ type: 'room.subscribe', roomId });
    } catch (e) {
      this.error.set(
        e instanceof Error ? e.message : 'Online play is unavailable right now.',
      );
    }
  }
  /** "Play": tells the server we are at the court; the match starts when both players are. */
  async ready(): Promise<void> {
    const r = this.room();
    if (!r?.matchId) return;
    await this.action(async () => {
      const realtime = await this.ensureRealtime();
      realtime.send({ type: 'match.ready', matchId: r.matchId });
      this.readySent.set(true);
    });
  }
  private onLink(status: RealtimeStatus): void {
    this.link.set(status);
    if (status === 'open' && this.realtime) {
      // Back after a drop: watch the court again and ask for the current frame.
      if (this.subscribedRoom)
        this.realtime.send({
          type: 'room.subscribe',
          roomId: this.subscribedRoom,
        });
      if (this.online && this.page() === 'online') {
        this.realtime.send({
          type: 'match.ready',
          matchId: this.online.matchId,
        });
        this.realtime.send({
          type: 'match.resync',
          matchId: this.online.matchId,
        });
      }
    }
    if (
      status === 'closed' &&
      this.page() === 'online' &&
      this.onlineStatus() !== 'finished'
    )
      this.error.set('Connection lost.');
  }
  private onMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'room.updated':
        this.onRoomUpdated(message.room);
        break;
      case 'match.waiting':
        if (message.readyPlayerId !== this.realtime?.playerId)
          this.opponentReady.set(true);
        break;
      case 'match.started': {
        const me = this.realtime?.playerId ?? '';
        this.online = new OnlineMatch(message.matchId, me, message.players);
        const rival = this.room()?.members?.find(
          (m) => m.id === this.online!.opponentId,
        );
        this.opponentName.set(rival?.username ?? 'Opponent');
        this.rewards.set(null);
        this.onlineStatus.set('playing');
        this.state.set({ ...this.online.state });
        this.keys.clear();
        this.page.set('online');
        break;
      }
      case 'match.snapshot':
        if (this.online?.matchId === message.matchId) {
          this.online.applySnapshot(message, performance.now());
          if (
            this.onlineStatus() === 'suspended' &&
            message.phase !== 'suspended'
          )
            this.onlineStatus.set('playing');
        }
        break;
      case 'match.point':
        if (this.online?.matchId === message.matchId) {
          this.online.applyScore(message.score);
          const mine = message.winnerId === this.online.me;
          this.showToast(
            mine ? 'Your point!' : 'Point to ' + this.opponentName(),
          );
        }
        break;
      case 'match.suspended':
        if (this.online?.matchId === message.matchId) {
          this.onlineStatus.set('suspended');
          this.reconnectDeadline.set(message.reconnectDeadline);
        }
        break;
      case 'match.resumed':
        if (
          this.online?.matchId === message.matchId &&
          this.onlineStatus() === 'suspended'
        )
          this.onlineStatus.set('playing');
        break;
      case 'match.finished':
        if (this.online?.matchId === message.matchId) {
          this.online.applyScore(message.score);
          this.online.finish();
          this.rewards.set(message.rewards);
          this.profile.set(message.profile);
          this.onlineStatus.set('finished');
          this.state.set({ ...this.online.state });
          this.clearRoom();
        }
        break;
      case 'error':
        if (message.code !== 'MATCH_NOT_RUNNING') this.error.set(message.message);
        break;
      default:
        break;
    }
  }
  private onRoomUpdated(room: RealtimeRoom): void {
    const current = this.room();
    if (!current || current.id !== room.id) return;
    if (room.status === 'closed') {
      if (this.page() !== 'online') {
        this.clearRoom();
        this.showToast('The court was closed.');
      }
      return;
    }
    this.room.set({
      ...current,
      status: 'waiting',
      serverStatus: room.status,
      matchId: room.matchId ?? undefined,
      inviteUrl: room.inviteUrl ?? current.inviteUrl,
      players: room.players.map((p) => p.username),
      members: room.players.map((p) => ({ id: p.id, username: p.username })),
    });
    if (room.status === 'waiting') this.readySent.set(false);
  }
  /** Leaving a running match forfeits it; the server scores it for the opponent. */
  leaveOnline(): void {
    if (this.online && this.onlineStatus() !== 'finished' && this.realtime)
      this.realtime.send({ type: 'match.leave', matchId: this.online.matchId });
    this.online = undefined;
    this.onlineStatus.set('connecting');
    this.clearRoom();
    this.realtime?.close();
    this.realtime = undefined;
  }
  private showToast(text: string): void {
    this.toast.set(text);
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toast.set(''), 1800);
  }

  // ------------------------------------------------------------------
  // championship: a live-ops event, invisible while none is on
  // ------------------------------------------------------------------

  private async loadChampionship(): Promise<void> {
    if (this.disposed || this.championshipLoading || !this.api.championship) return;
    this.championshipLoading = true;
    try {
      const season = await this.api.championship();
      if (this.disposed) return;
      if (season?.id !== this.championship()?.id) this.standings.set(null);
      this.championship.set(season);
      if (!season && this.page() === 'cup') this.page.set('club');
    } catch {
      if (!this.disposed) {
        this.championship.set(null);
        this.standings.set(null);
        if (this.page() === 'cup') this.page.set('club');
      }
    } finally {
      this.championshipLoading = false;
    }
  }
  async openCup(): Promise<void> {
    if (!this.championship()) return;
    this.page.set('cup');
    await this.refreshCup();
  }
  async refreshCup(): Promise<void> {
    await this.loadChampionship();
    const season = this.championship();
    if (!season || !this.api.standings) return;
    try {
      const [standings, trophies] = await Promise.all([
        this.api.standings(season.id),
        this.api.trophies ? this.api.trophies() : Promise.resolve([]),
      ]);
      if (this.disposed || this.championship()?.id !== season.id) return;
      this.standings.set(standings);
      this.trophies.set(trophies);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Please try again');
    }
  }
  async register(): Promise<void> {
    const season = this.championship();
    if (!season || !this.api.registerForChampionship) return;
    await this.action(async () => {
      await this.api.registerForChampionship!(season.id);
      await this.refreshCup();
    });
  }
  /** Walks to the bracket court; the ready handshake then starts the match. */
  async playBracket(match: TennisBracketMatch): Promise<void> {
    if (!match.roomId || !this.api.getRoom) return;
    await this.action(async () => {
      this.setRoom(await this.api.getRoom!(match.roomId!));
      this.page.set('friends');
    });
  }
  // ------------------------------------------------------------------
  // gear and gym
  // ------------------------------------------------------------------

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
    clearTimeout(this.toastTimer);
    clearInterval(this.championshipTimer);
    this.observer?.disconnect();
    this.scene?.destroy();
    document.removeEventListener('keydown', this.keydown);
    document.removeEventListener('keyup', this.keyup);
    document.removeEventListener('visibilitychange', this.visibility);
    if (this.page() === 'online') this.leaveOnline();
    else {
      const r = this.room();
      if (r) void this.api.cancelRoom(r.id);
      this.realtime?.close();
    }
  }
}
