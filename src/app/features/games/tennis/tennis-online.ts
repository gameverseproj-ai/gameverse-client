import { MatchState } from './tennis-match';
import { MatchSnapshot, SnapshotPlayer } from './tennis-realtime';

export type Swing = 'none' | 'flat' | 'topspin' | 'slice';
export interface InputFrame {
  sequence: number;
  clientTick: number;
  moveX: number;
  swing: Swing;
  aimX: number;
}

/**
 * The local view of a server-simulated match. The server speaks absolute court
 * coordinates with the first player on +z; this model mirrors everything so the
 * local player always defends the near baseline like in practice, and mirrors
 * inputs back before they are sent. Between 20 Hz snapshots the ball is
 * extrapolated along its velocity and the players eased toward their last
 * known spot, which is what keeps 60 fps rendering smooth.
 */
export class OnlineMatch {
  readonly state: MatchState = {
    x: 0, z: 7, player: 0, opponent: 0, stamina: 100,
    score: 0, rivalScore: 0, rally: 0, phase: 'serve', activeSeconds: 0,
  };
  readonly side: 1 | -1;
  readonly opponentId: string;
  phase: MatchSnapshot['phase'] = 'waiting';
  serving = false;
  lastProcessedSequence = 0;
  private latest?: MatchSnapshot;
  private receivedAt = 0;
  private target = 0;
  private sequence = 0;
  private pendingSwing: Swing = 'none';
  private pendingAim = 0;
  private rivalTarget = 0;
  constructor(readonly matchId: string, readonly me: string, players: SnapshotPlayer[]) {
    const mine = players.find((p) => p.id === me);
    this.side = mine?.side ?? 1;
    this.opponentId = players.find((p) => p.id !== me)?.id ?? '';
  }

  /** Mirrors a server x/z into the local player's perspective. */
  private mirror(value: number): number {
    return this.side === 1 ? value : -value;
  }

  applySnapshot(snapshot: MatchSnapshot, now: number): void {
    this.latest = snapshot;
    this.receivedAt = now;
    this.phase = snapshot.phase;
    this.lastProcessedSequence = snapshot.lastProcessedSequence;
    this.serving = snapshot.serverId === this.me;
    const s = this.state;
    const mine = snapshot.players.find((p) => p.id === this.me);
    const rival = snapshot.players.find((p) => p.id === this.opponentId);
    s.stamina = mine?.stamina ?? s.stamina;
    s.score = snapshot.score[this.me] ?? 0;
    s.rivalScore = snapshot.score[this.opponentId] ?? 0;
    s.rally = snapshot.rally;
    s.activeSeconds = snapshot.activeSeconds;
    s.phase = snapshot.phase === 'rally' ? 'rally' : snapshot.phase === 'finished' ? 'finished' : 'serve';
    if (mine) s.player = this.mirror(mine.position.x);
    if (rival) this.rivalTarget = this.mirror(rival.position.x);
  }

  applyScore(score: Record<string, number>): void {
    this.state.score = score[this.me] ?? this.state.score;
    this.state.rivalScore = score[this.opponentId] ?? this.state.rivalScore;
  }

  finish(): void {
    this.phase = 'finished';
    this.state.phase = 'finished';
  }

  /** Advances the rendered state; `now` is `performance.now()`. */
  tick(now: number, dt: number): void {
    const s = this.state;
    if (this.latest) {
      const age = Math.min(0.12, Math.max(0, (now - this.receivedAt) / 1000));
      const { position, velocity } = this.latest.ball;
      const x = this.latest.phase === 'rally' ? position.x + velocity.x * age : position.x;
      const z = this.latest.phase === 'rally' ? position.z + velocity.z * age : position.z;
      s.x = this.mirror(Math.max(-4.6, Math.min(4.6, x)));
      s.z = this.mirror(z);
    }
    const ease = Math.min(1, dt * 14);
    s.opponent += (this.rivalTarget - s.opponent) * ease;
    if (s.phase !== 'rally' && this.serving) s.x = s.player;
  }

  /** Where the local player wants to stand, in their own perspective. */
  move(x: number): void {
    this.target = Math.max(-4.5, Math.min(4.5, x));
  }

  swing(aim = 0, spin = 0): void {
    this.pendingSwing = spin > 0.3 ? 'topspin' : spin < -0.3 ? 'slice' : 'flat';
    this.pendingAim = Math.max(-1, Math.min(1, aim));
  }

  /** The next frame to send; the swing goes out once. */
  nextFrame(): InputFrame {
    const gap = this.target - this.state.player;
    const moveX = Math.abs(gap) < 0.08 ? 0 : Math.max(-1, Math.min(1, gap * 1.6));
    const frame: InputFrame = {
      sequence: ++this.sequence,
      clientTick: this.sequence,
      moveX: this.mirror(moveX),
      swing: this.pendingSwing,
      aimX: this.mirror(this.pendingAim),
    };
    this.pendingSwing = 'none';
    this.pendingAim = 0;
    // Predict our own movement so the robot does not wait a round trip.
    this.state.player += Math.max(-0.07, Math.min(0.07, gap));
    return frame;
  }
}
