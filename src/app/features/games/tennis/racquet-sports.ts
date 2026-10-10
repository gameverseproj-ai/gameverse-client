import {
  RACKETS,
  TennisProfile,
  TennisRacket,
  TennisSport,
} from './tennis.api';
import { MatchState, TennisMatch } from './tennis-match';

export const SPORT_RULES = {
  tennis: {
    name: 'Tennis',
    points: 5,
    cap: 5,
    hint: 'Return the ball across the net.',
  },
  'ping-pong': {
    name: 'Ping pong',
    points: 11,
    cap: 21,
    hint: 'Let the ball bounce once on your side, then return it.',
  },
  squash: {
    name: 'Squash',
    points: 11,
    cap: 21,
    hint: 'Take turns after the front-wall rebound. Only one floor bounce.',
  },
  badminton: {
    name: 'Badminton',
    points: 21,
    cap: 30,
    hint: 'Keep the shuttle in the air. A ground contact ends the rally.',
  },
} as const;
export interface PracticeMatch {
  readonly state: MatchState;
  move(x: number): void;
  swing(aim?: number, spin?: number): void;
  tick(dt: number): void;
}
export function createPractice(
  profile: TennisProfile,
  rackets: TennisRacket[] = RACKETS,
  sport: TennisSport = 'tennis',
): PracticeMatch {
  return sport === 'tennis'
    ? new TennisMatch(profile, rackets)
    : new RacquetMatch(profile, rackets, sport);
}

/** Local bot practice of the same arcade rules enforced by be-core. Never grants rewards. */
export class RacquetMatch implements PracticeMatch {
  readonly state: MatchState = {
    x: 0,
    y: 1.4,
    z: 7,
    player: 0,
    opponent: 0,
    stamina: 100,
    score: 0,
    rivalScore: 0,
    rally: 0,
    phase: 'serve',
    activeSeconds: 0,
    serving: true,
  };
  private vx = 0;
  private vz = 0;
  private vy = 0;
  private clock = 0;
  private serveAt = 0;
  private target = 0;
  private until = 0;
  private aim = 0;
  private spin = 0;
  private hitter = 0;
  private server = 0;
  private bounces = 0;
  private front = false;
  private serveBounce = false;
  private readonly racket: TennisRacket;
  constructor(
    private profile: TennisProfile,
    rackets: TennisRacket[],
    readonly sport: Exclude<TennisSport, 'tennis'>,
  ) {
    this.racket =
      rackets.find((r) => r.id === profile.racket) ?? rackets[0] ?? RACKETS[0];
    this.state.playerZ = 7;
    this.state.opponentZ = sport === 'squash' ? 7 : -7;
  }
  private get squash() {
    return this.sport === 'squash';
  }
  private get ping() {
    return this.sport === 'ping-pong';
  }
  private get gravity() {
    return this.squash ? 6 : this.ping ? 8 : 7;
  }
  move(x: number): void {
    this.target = Math.max(-4.5, Math.min(4.5, x));
  }
  swing(aim = 0, spin = 0): void {
    if (this.state.phase === 'finished') return;
    this.aim = Math.max(-1, Math.min(1, aim));
    this.spin = Math.max(-1, Math.min(1, spin));
    this.until = this.clock + 0.45;
    if (this.state.phase === 'serve' && this.server === 0) this.launch(0, true);
  }
  tick(dt: number): void {
    dt = Math.min(0.04, Math.max(0, dt));
    this.clock += dt;
    const s = this.state;
    s.player +=
      Math.max(-4.8 * dt, Math.min(4.8 * dt, this.target - s.player)) *
      (0.55 + s.stamina / 220);
    const chase = this.hitter === 0 ? s.x : 0;
    s.opponent += Math.max(-3.6 * dt, Math.min(3.6 * dt, chase - s.opponent));
    if (s.phase !== 'rally') {
      s.stamina = Math.min(100, s.stamina + dt * 12);
      s.serving = this.server === 0;
      if (s.phase === 'serve') {
        s.x = this.server === 0 ? s.player : s.opponent;
        s.y = 1.4;
        if (this.server === 1 && this.clock - this.serveAt > 1)
          this.launch(1, true);
      }
      return;
    }
    s.activeSeconds += dt;
    s.stamina = Math.max(
      8,
      s.stamina -
        (dt * (1.2 + Math.abs(this.target - s.player) * 0.5)) /
          (1 + this.profile.endurance * 0.12),
    );
    const previousZ = s.z;
    s.x += this.vx * dt;
    s.z += this.vz * dt;
    s.y = (s.y ?? 1.4) + this.vy * dt - 0.5 * this.gravity * dt * dt;
    this.vy -= this.gravity * dt;
    const receiver = 1 - this.hitter,
      receiverSide = receiver === 0 ? 1 : -1;
    if (Math.abs(s.x) > 4.6) {
      if (this.squash) {
        s.x = Math.sign(s.x) * 4.6;
        this.vx *= -1;
      } else {
        this.point(receiver);
        return;
      }
    }
    if (this.squash && s.z <= -8) {
      if (s.y < 0.4 || s.y > 6) {
        this.point(receiver);
        return;
      }
      s.z = -8;
      this.vz = Math.abs(this.vz);
      this.front = true;
    }
    if (!this.squash && previousZ * s.z < 0 && s.y < (this.ping ? 0.35 : 1.4)) {
      this.point(receiver);
      return;
    }
    if (s.y <= 0) {
      if (this.squash) {
        if (!this.front) {
          this.point(receiver);
          return;
        }
        if (++this.bounces > 1) {
          this.point(this.hitter);
          return;
        }
        s.y = 0;
        this.vy = Math.abs(this.vy) * 0.78;
      } else if (this.ping) {
        if (this.serveBounce) {
          if (s.z * -receiverSide <= 0) {
            this.point(receiver);
            return;
          }
          this.serveBounce = false;
          s.y = 0;
          this.vy =
            (this.gravity * (Math.abs(s.z) + 4)) / Math.abs(this.vz) / 2;
        } else {
          if (s.z * receiverSide <= 0) {
            this.point(receiver);
            return;
          }
          if (++this.bounces > 1) {
            this.point(this.hitter);
            return;
          }
          s.y = 0;
          this.vy = Math.abs(this.vy) * 0.85;
        }
      } else {
        this.point(s.z * receiverSide > 0 ? this.hitter : receiver);
        return;
      }
    }
    const incoming = this.squash
      ? this.front && this.vz > 0 && s.z >= 6.6
      : this.vz * receiverSide > 0 && s.z * receiverSide >= 6.6;
    const x = receiver === 0 ? s.player : s.opponent;
    const swinging = receiver === 1 || this.clock <= this.until;
    if (
      incoming &&
      Math.abs(s.x - x) < 1.25 &&
      swinging &&
      s.y > 0 &&
      s.y < (this.ping ? 2.4 : 4.5)
    ) {
      if (this.ping && (this.serveBounce || this.bounces !== 1)) {
        this.point(this.hitter);
        return;
      }
      this.launch(receiver, false);
      s.rally++;
    } else if (this.squash ? s.z > 8.4 : s.z * receiverSide > 8.4)
      this.point(this.hitter);
  }
  private launch(player: number, serving: boolean): void {
    const s = this.state,
      side = player === 0 ? 1 : -1;
    this.hitter = player;
    this.bounces = 0;
    this.front = false;
    this.serveBounce = this.ping && serving;
    const base = this.ping ? 12 : this.squash ? 13 : 10;
    const power = player === 0 ? this.profile.power : 1;
    const stamina = player === 0 ? s.stamina : 100;
    const racket = player === 0 ? this.racket : RACKETS[0];
    const pace =
      base * (0.9 + power * 0.012) * (0.85 + stamina / 650) * racket.speed;
    const aim = player === 0 ? this.aim : Math.sin(this.clock * 1.7) * 0.55;
    const spin = player === 0 ? this.spin : 0;
    s.phase = 'rally';
    s.x = player === 0 ? s.player : s.opponent;
    s.z = this.squash ? 6.55 : side * 6.55;
    s.y = this.ping ? 1.3 : 1.6;
    this.vz = (this.squash ? -1 : -side) * pace;
    this.vx = aim * (this.ping ? 2.8 : 3.8) + spin * racket.spin;
    const travel = (this.ping ? (serving ? 3 : 10.55) : 14.7) / pace;
    this.vy = this.squash
      ? 4.6
      : (0.5 * this.gravity * travel * travel - s.y) / travel +
        (!this.ping && spin < -0.3 ? 0.7 : 0);
    if (player === 0) {
      s.stamina = Math.max(8, s.stamina - (this.squash ? 4 : 3));
      this.until = 0;
    }
    if (serving) s.rally = 0;
  }
  private point(winner: number): void {
    const s = this.state;
    winner === 0 ? s.score++ : s.rivalScore++;
    const rules = SPORT_RULES[this.sport];
    const max = Math.max(s.score, s.rivalScore);
    s.phase =
      max >= rules.points &&
      (Math.abs(s.score - s.rivalScore) >= 2 || max >= rules.cap)
        ? 'finished'
        : 'serve';
    const total = s.score + s.rivalScore;
    if (this.ping) {
      if (total >= 20 || total % 2 === 0) this.server = 1 - this.server;
    } else this.server = winner;
    this.serveAt = this.clock;
    this.until = 0;
    s.z = this.squash || this.server === 0 ? 7 : -7;
    s.y = 1.4;
    s.serving = this.server === 0;
    s.stamina = Math.min(100, s.stamina + 18);
  }
}
