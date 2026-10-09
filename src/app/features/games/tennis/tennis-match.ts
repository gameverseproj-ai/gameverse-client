import { RACKETS, TennisProfile } from './tennis.api';
export interface MatchState {
  x: number;
  z: number;
  player: number;
  opponent: number;
  stamina: number;
  score: number;
  rivalScore: number;
  rally: number;
  phase: 'serve' | 'rally' | 'finished';
  activeSeconds: number;
}
/** Deterministic arcade practice model; the server will own real match simulation. */
export class TennisMatch {
  readonly state: MatchState = {
    x: 0,
    z: 7,
    player: 0,
    opponent: 0,
    stamina: 100,
    score: 0,
    rivalScore: 0,
    rally: 0,
    phase: 'serve',
    activeSeconds: 0,
  };
  private vx = 0;
  private vz = -8;
  private swingUntil = 0;
  private clock = 0;
  private target = 0;
  private aim = 0;
  private spin = 0;
  constructor(private profile: TennisProfile) {}
  move(x: number): void {
    this.target = Math.max(-4.5, Math.min(4.5, x));
  }
  swing(aim = 0, spin = 0): void {
    if (this.state.phase === 'finished') return;
    this.aim = Math.max(-1, Math.min(1, aim));
    this.spin = Math.max(-1, Math.min(1, spin));
    this.swingUntil = this.clock + 0.45;
    if (this.state.phase === 'serve') {
      this.state.phase = 'rally';
      this.state.x = this.state.player;
      this.state.z = 6.9;
      this.vx = this.aim * 4;
      this.vz = -8;
      this.state.rally = 0;
    }
  }
  tick(dt: number): void {
    dt = Math.min(0.04, Math.max(0, dt));
    this.clock += dt;
    const s = this.state;
    const speed = 4.8 * (0.55 + s.stamina / 220);
    s.player += Math.max(
      -speed * dt,
      Math.min(speed * dt, this.target - s.player),
    );
    if (s.phase !== 'rally') {
      s.stamina = Math.min(100, s.stamina + 12 * dt);
      s.x = s.player;
      return;
    }
    s.activeSeconds += dt;
    s.stamina = Math.max(
      8,
      s.stamina -
        (dt * (1.2 + Math.abs(this.target - s.player) * 0.5)) /
          (1 + this.profile.endurance * 0.12),
    );
    const aiSpeed = 2.7;
    s.opponent += Math.max(
      -aiSpeed * dt,
      Math.min(aiSpeed * dt, s.x - s.opponent),
    );
    s.x += this.vx * dt;
    s.z += this.vz * dt;
    if (Math.abs(s.x) > 4.6) {
      s.x = Math.sign(s.x) * 4.6;
      this.vx *= -1;
    }
    if (this.vz > 0 && s.z >= 6.6) {
      if (Math.abs(s.x - s.player) < 1.25 && this.clock <= this.swingUntil) {
        const racket = RACKETS.find((r) => r.id === this.profile.racket)!;
        this.vz =
          -(8 + this.profile.power * 0.25) *
          (0.7 + s.stamina / 330) *
          racket.speed;
        this.vx = this.aim * 5 + this.spin * racket.spin * 2;
        s.z = 6.55;
        s.rally++;
        s.stamina = Math.max(8, s.stamina - 3);
        this.swingUntil = 0;
      } else if (s.z > 8.4) this.point(false);
    }
    if (this.vz < 0 && s.z <= -6.6) {
      if (Math.abs(s.x - s.opponent) < 1.15) {
        this.vz = 8.3;
        this.vx = Math.sin(this.clock * 1.7) * 3.4;
        s.z = -6.55;
        s.rally++;
      } else this.point(true);
    }
  }
  private point(won: boolean): void {
    const s = this.state;
    won ? s.score++ : s.rivalScore++;
    s.phase = s.score >= 5 || s.rivalScore >= 5 ? 'finished' : 'serve';
    s.stamina = Math.min(100, s.stamina + 18);
    s.z = 7;
    s.x = s.player;
  }
}
