import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SessionStore } from './session.store';
import {
  RacketId,
  TennisApi,
  TennisChampionship,
  TennisStandings,
  TennisTrophy,
  TennisProfile,
  TennisRealtimeTicket,
  TennisRepEvent,
  TennisRoom,
  TennisSport,
  TennisTrainingChallenge,
} from '../../../features/games/tennis/tennis.api';
import { API_BASE_URL } from './api-config';

/** Server shapes, per be-core's `/api/tennis` (docs/tennis-server-contract.yaml). */
interface ServerRoom {
  id: string;
  sport: TennisSport;
  status: 'waiting' | 'ready' | 'playing' | 'closed';
  inviteUrl: string | null;
  matchId: string | null;
  players: { id: string; username: string; owner: boolean }[];
}
interface ServerTraining {
  id: string;
  challenge: { exerciseId: string; reps: number; minIntervalMs: number; maxDurationMs: number };
}

/**
 * Tennis Island against be-core. Progress is the server's: endurance comes
 * only from server-timed network matches, power only from a verified gym
 * session, and rackets are paid from the shared wallet. The local practice
 * court therefore grants nothing here; `completePractice` just re-reads the
 * profile.
 */
@Injectable({ providedIn: 'root' })
export class HttpTennisApi implements TennisApi {
  readonly mock = false;
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private readonly session = inject(SessionStore);
  private readonly url = () => `${this.base}/api/tennis`;

  playerId(): string | null {
    return this.session.read()?.playerId ?? null;
  }

  profile(): Promise<TennisProfile> {
    return firstValueFrom(this.http.get<TennisProfile>(`${this.url()}/profile`));
  }

  async createRoom(sport: TennisSport, username?: string): Promise<TennisRoom> {
    const invitedUsername = username?.trim() || undefined;
    const room = await firstValueFrom(this.http.post<ServerRoom>(`${this.url()}/rooms`, {
      sport,
      visibility: invitedUsername ? 'private' : 'public',
      invitedUsername,
      idempotencyKey: crypto.randomUUID(),
    }));
    return toRoom(room, invitedUsername);
  }

  async joinByInvite(token: string): Promise<TennisRoom> {
    const preview = await firstValueFrom(this.http.get<ServerRoom>(`${this.url()}/invitations/${encodeURIComponent(token)}`));
    const joined = await firstValueFrom(this.http.post<{ room: ServerRoom }>(`${this.url()}/rooms/${preview.id}/join`, {
      inviteToken: token,
      idempotencyKey: crypto.randomUUID(),
    }));
    return toRoom(joined.room);
  }

  async currentRoom(): Promise<TennisRoom | null> {
    const room = await firstValueFrom(this.http.get<ServerRoom | null>(`${this.url()}/rooms/mine`));
    return room ? toRoom(room) : null;
  }

  async listRooms(sport: TennisSport): Promise<TennisRoom[]> {
    const page = await firstValueFrom(this.http.get<{ items: ServerRoom[] }>(`${this.url()}/rooms`, { params: { sport } }));
    return page.items.map(room => toRoom(room));
  }

  async joinRoom(id: string): Promise<TennisRoom> {
    const joined = await firstValueFrom(this.http.post<{ room: ServerRoom }>(`${this.url()}/rooms/${id}/join`, {
      idempotencyKey: crypto.randomUUID(),
    }));
    return toRoom(joined.room);
  }

  realtimeTicket(): Promise<TennisRealtimeTicket> {
    return firstValueFrom(this.http.post<TennisRealtimeTicket>(`${this.url()}/realtime/ticket`, null));
  }

  /** A path is relative to the API origin (same-origin behind the dev proxy). */
  realtimeUrl(realtimeUrl: string, ticket: string): string {
    const absolute = /^wss?:/.test(realtimeUrl)
      ? realtimeUrl
      : (this.base || location.origin).replace(/^http/, 'ws') + realtimeUrl;
    return `${absolute}?ticket=${encodeURIComponent(ticket)}`;
  }

  async getRoom(id: string): Promise<TennisRoom> {
    return toRoom(await firstValueFrom(this.http.get<ServerRoom>(`${this.url()}/rooms/${id}`)));
  }

  championship(): Promise<TennisChampionship | null> {
    return firstValueFrom(this.http.get<TennisChampionship | null>(`${this.url()}/championships/current`));
  }

  async registerForChampionship(id: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.url()}/championships/${id}/registration`, {
      idempotencyKey: crypto.randomUUID(),
    }));
  }

  standings(id: string): Promise<TennisStandings> {
    return firstValueFrom(this.http.get<TennisStandings>(`${this.url()}/championships/${id}/standings`));
  }

  async trophies(): Promise<TennisTrophy[]> {
    return (await firstValueFrom(this.http.get<{ items: TennisTrophy[] }>(`${this.url()}/profile/trophies`))).items;
  }

  cancelRoom(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.url()}/rooms/${id}`));
  }

  /** Buys the racket first when it is not owned yet, then equips it. */
  async equip(racket: RacketId): Promise<TennisProfile> {
    const current = await this.profile();
    if (!current.owned.includes(racket)) {
      await firstValueFrom(this.http.post(`${this.url()}/rackets/${racket}/purchase`, {
        idempotencyKey: crypto.randomUUID(),
      }));
    }
    return firstValueFrom(this.http.put<TennisProfile>(`${this.url()}/profile/racket`, { racketId: racket }));
  }

  async startTraining(): Promise<TennisTrainingChallenge> {
    const session = await firstValueFrom(this.http.post<ServerTraining>(`${this.url()}/training/sessions`, {
      exerciseId: 'serve-reps',
      idempotencyKey: crypto.randomUUID(),
    }));
    return { id: session.id, reps: session.challenge.reps, minIntervalMs: session.challenge.minIntervalMs };
  }

  async train(challenge: TennisTrainingChallenge, events: TennisRepEvent[]): Promise<TennisProfile> {
    const result = await firstValueFrom(this.http.post<{ profile: TennisProfile }>(
      `${this.url()}/training/sessions/${challenge.id}/complete`,
      { events, idempotencyKey: crypto.randomUUID() }));
    return result.profile;
  }

  /** Practice is local and unverified: it cannot grant progress against the server. */
  completePractice(): Promise<TennisProfile> {
    return this.profile();
  }
}

function toRoom(room: ServerRoom, invitedUsername?: string): TennisRoom {
  return {
    id: room.id,
    sport: room.sport,
    status: room.status === 'closed' ? 'cancelled' : 'waiting',
    ...(invitedUsername ? { invitedUsername } : {}),
    ...(room.inviteUrl ? { inviteUrl: room.inviteUrl } : {}),
    ...(room.matchId ? { matchId: room.matchId } : {}),
    players: room.players.map(p => p.username),
    members: room.players.map(p => ({ id: p.id, username: p.username })),
    serverStatus: room.status,
  };
}
