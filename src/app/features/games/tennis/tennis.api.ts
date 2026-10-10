import { InjectionToken, Injectable } from '@angular/core';

export type TennisSport = 'tennis' | 'ping-pong' | 'squash' | 'badminton';
export type RacketId = 'starter' | 'spin' | 'power';
export interface TennisProfile {
  endurance: number;
  power: number;
  coins: number;
  racket: RacketId;
  owned: RacketId[];
  activeSeconds: number;
}
export interface TennisRoom {
  id: string;
  sport: TennisSport;
  status: 'waiting' | 'cancelled';
  invitedUsername?: string;
  /** Server-issued invitation link; the mock has none. */
  inviteUrl?: string;
  /** Set once a second player has joined and the server opened a match. */
  matchId?: string;
  /** Usernames on the court, owner first. */
  players?: string[];
  /** Court members with their server IDs, owner first. */
  members?: { id: string; username: string }[];
  /** Server status; the mock only ever waits. */
  serverStatus?: 'waiting' | 'ready' | 'playing' | 'closed';
}
/** A live-ops season; null when no event is on, in which case the club shows nothing. */
export interface TennisChampionship {
  id: string;
  sport: TennisSport;
  season: string;
  registrationClosesAt: string;
  startsAt: string;
  endsAt: string;
  status: 'registration' | 'running' | 'finished' | 'cancelled';
  rules: { format: string; pointsToWin: number; minPlayers: number; maxPlayers: number; roundDurationMinutes: number };
  prize: { title: string; coins: number; gems: number; xp: number; trophyAssetUrl: string };
  registrationOpen: boolean;
  registered: boolean;
  participants: number;
}
export interface TennisStanding {
  playerId: string;
  username: string;
  avatarUrl: string;
  seed: number | null;
  wins: number;
  losses: number;
  status: 'registered' | 'eliminated' | 'champion';
}
export interface TennisBracketMatch {
  id: string;
  slot: number;
  playerAId: string | null;
  playerBId: string | null;
  winnerId: string | null;
  roomId: string | null;
  status: 'pending' | 'finished' | 'walkover' | 'bye';
  deadlineAt: string | null;
}
export interface TennisStandings {
  standings: TennisStanding[];
  bracket: { rounds: { round: number; name: string; matches: TennisBracketMatch[] }[] };
  champion: TennisStanding | null;
}
export interface TennisTrophy {
  championshipId: string;
  sport: TennisSport;
  season: string;
  wonAt: string;
  trophyAssetUrl: string;
}
export interface TennisRealtimeTicket {
  ticket: string;
  realtimeUrl: string;
}
export interface TennisTrainingChallenge {
  id: string;
  reps: number;
  minIntervalMs: number;
}
export interface TennisRepEvent {
  sequence: number;
  elapsedMs: number;
  action: 'rep';
}
export interface TennisApi {
  readonly mock: boolean;
  profile(): Promise<TennisProfile>;
  createRoom(sport: TennisSport, username?: string): Promise<TennisRoom>;
  /** Joins the court behind an invitation link; absent on the mock. */
  joinByInvite?(token: string): Promise<TennisRoom>;
  /** The court the player is already on, so a reload resumes it; absent on the mock. */
  currentRoom?(): Promise<TennisRoom | null>;
  /** Open public courts waiting for an opponent; absent on the mock. */
  listRooms?(sport: TennisSport): Promise<TennisRoom[]>;
  /** Takes the second seat on a public court; absent on the mock. */
  joinRoom?(id: string): Promise<TennisRoom>;
  /** One-time ticket for the realtime socket; absent on the mock. */
  realtimeTicket?(): Promise<TennisRealtimeTicket>;
  /** Turns the ticket response into a socket URL; absent on the mock. */
  realtimeUrl?(realtimeUrl: string, ticket: string): string;
  /** The signed-in player's server ID, to find oneself in a bracket; absent on the mock. */
  playerId?(): string | null;
  /** The season on now, or null when no event is running; absent on the mock. */
  championship?(): Promise<TennisChampionship | null>;
  registerForChampionship?(id: string): Promise<void>;
  standings?(id: string): Promise<TennisStandings>;
  trophies?(): Promise<TennisTrophy[]>;
  /** A court by ID, e.g. the bracket court a player is seated at; absent on the mock. */
  getRoom?(id: string): Promise<TennisRoom>;
  cancelRoom(id: string): Promise<void>;
  equip(racket: RacketId): Promise<TennisProfile>;
  /** Opens a gym challenge; the rep log is checked by `train`. */
  startTraining(): Promise<TennisTrainingChallenge>;
  train(challenge: TennisTrainingChallenge, events: TennisRepEvent[]): Promise<TennisProfile>;
  completePractice(activeSeconds: number): Promise<TennisProfile>;
}
export const RACKETS: {
  id: RacketId;
  name: string;
  price: number;
  spin: number;
  speed: number;
}[] = [
  { id: 'starter', name: 'Orbit', price: 0, spin: 0, speed: 1 },
  { id: 'spin', name: 'Prism', price: 100, spin: 1, speed: 0.96 },
  { id: 'power', name: 'Volt', price: 150, spin: 0.3, speed: 1.12 },
];
const initial = (): TennisProfile => ({
  endurance: 1,
  power: 1,
  coins: 200,
  racket: 'starter',
  owned: ['starter'],
  activeSeconds: 0,
});
/** Local development adapter. No real invitations, opponents, purchases or championship rewards. */
@Injectable({ providedIn: 'root' })
export class MockTennisApi implements TennisApi {
  readonly mock = true;
  private value = initial();
  private loaded = false;
  private rooms = new Map<string, TennisRoom>();
  async profile(): Promise<TennisProfile> {
    if (!this.loaded) {
      this.loaded = true;
      try {
        const p = JSON.parse(
          localStorage.getItem('gameverse.tennis.mock.v1') ?? 'null',
        ) as TennisProfile | null;
        if (
          p &&
          Number.isFinite(p.coins) &&
          Number.isFinite(p.activeSeconds) &&
          p.endurance >= 1 &&
          p.endurance <= 10 &&
          p.power >= 1 &&
          p.power <= 10 &&
          RACKETS.some((r) => r.id === p.racket) &&
          Array.isArray(p.owned) &&
          p.owned.includes(p.racket)
        )
          this.value = p;
      } catch {
        /* Optional local storage. */
      }
    }
    return structuredClone(this.value);
  }
  async createRoom(sport: TennisSport, username?: string): Promise<TennisRoom> {
    if (
      username !== undefined &&
      !/^[\p{L}\p{N}_-]{3,32}$/u.test(username.trim())
    )
      throw new Error('Use 3–32 letters, numbers, _ or -.');
    const room: TennisRoom = {
      id: crypto.randomUUID(),
      sport,
      status: 'waiting',
      ...(username ? { invitedUsername: username.trim() } : {}),
    };
    this.rooms.set(room.id, room);
    return { ...room };
  }
  async cancelRoom(id: string): Promise<void> {
    this.rooms.delete(id);
  }
  async equip(id: RacketId): Promise<TennisProfile> {
    const racket = RACKETS.find((r) => r.id === id);
    if (!racket) throw new Error('Unknown racket');
    if (!this.value.owned.includes(id)) {
      if (this.value.coins < racket.price)
        throw new Error('Not enough demo coins');
      this.value.coins -= racket.price;
      this.value.owned.push(id);
    }
    this.value.racket = id;
    return this.save();
  }
  async startTraining(): Promise<TennisTrainingChallenge> {
    return { id: 'mock', reps: 20, minIntervalMs: 500 };
  }
  async train(
    challenge: TennisTrainingChallenge,
    events: TennisRepEvent[],
  ): Promise<TennisProfile> {
    if (events.length < challenge.reps) throw new Error('Finish the drill first');
    this.value.power = Math.min(10, this.value.power + 1);
    return this.save();
  }
  async completePractice(seconds: number): Promise<TennisProfile> {
    this.value.activeSeconds += Math.max(0, Math.min(600, Math.floor(seconds)));
    this.value.endurance = Math.min(
      10,
      1 + Math.floor(this.value.activeSeconds / 120),
    );
    return this.save();
  }
  private save(): TennisProfile {
    try {
      localStorage.setItem(
        'gameverse.tennis.mock.v1',
        JSON.stringify(this.value),
      );
    } catch {
      /* Optional. */
    }
    return structuredClone(this.value);
  }
}
export const TENNIS_API = new InjectionToken<TennisApi>('TENNIS_API', {
  providedIn: 'root',
  factory: () => new MockTennisApi(),
});
