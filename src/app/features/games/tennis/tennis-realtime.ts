import { TennisRealtimeTicket } from './tennis.api';

/** Frames be-core sends over `/api/tennis/realtime`. */
export interface Vec { x: number; z: number; }
export interface SnapshotPlayer { id: string; position: Vec; stamina: number; side: 1 | -1; }
export interface MatchSnapshot {
  type: 'match.snapshot';
  matchId: string;
  serverTick: number;
  lastProcessedSequence: number;
  ball: { position: Vec; velocity: Vec };
  players: SnapshotPlayer[];
  score: Record<string, number>;
  phase: 'waiting' | 'serve' | 'rally' | 'finished' | 'suspended';
  serverId: string;
  rally: number;
  activeSeconds: number;
}
export interface MatchRewards {
  coins: number; xp: number; activeSeconds: number;
  enduranceBefore: number; enduranceAfter: number; won: boolean;
}
export type ServerMessage =
  | { type: 'connected'; playerId: string }
  | { type: 'room.updated'; room: RealtimeRoom; serverTime: string }
  | { type: 'match.waiting'; matchId: string; readyPlayerId: string }
  | { type: 'match.started'; matchId: string; roomId: string; players: SnapshotPlayer[]; serverTick: number }
  | MatchSnapshot
  | { type: 'match.point'; matchId: string; winnerId: string; score: Record<string, number>; reason: string }
  | { type: 'match.finished'; matchId: string; winnerId: string | null; score: Record<string, number>; reason: string;
      profile: import('./tennis.api').TennisProfile; rewards: MatchRewards; trophy?: { assetUrl: string } }
  | { type: 'match.suspended'; matchId: string; playerId: string; reconnectDeadline: string }
  | { type: 'match.resumed'; matchId: string; playerId: string }
  | { type: 'error'; code: string; message: string; retryable: boolean }
  | { type: 'pong'; serverTime: string };
export interface RealtimeRoom {
  id: string;
  sport: string;
  status: 'waiting' | 'ready' | 'playing' | 'closed';
  inviteUrl: string | null;
  matchId: string | null;
  players: { id: string; username: string; owner: boolean; connected: boolean }[];
}
export type RealtimeStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed';

/**
 * One socket per screen. Every connection is opened with a fresh one-time
 * ticket, so the bearer token never travels in a URL. A dropped socket is
 * reopened with backoff while `keepAlive` is set; the owner is told through
 * `onStatus` so it can resubscribe and ask for a resync.
 */
export class TennisRealtime {
  playerId: string | null = null;
  status: RealtimeStatus = 'idle';
  keepAlive = true;
  private socket?: WebSocket;
  private attempts = 0;
  private timer = 0;
  constructor(
    private readonly ticket: () => Promise<TennisRealtimeTicket>,
    private readonly resolveUrl: (realtimeUrl: string, ticket: string) => string,
    private readonly onMessage: (message: ServerMessage) => void,
    private readonly onStatus: (status: RealtimeStatus) => void,
  ) {}

  /** Resolves once the server has acknowledged the ticket. */
  async connect(): Promise<void> {
    this.keepAlive = true;
    this.set(this.attempts ? 'reconnecting' : 'connecting');
    const { ticket, realtimeUrl } = await this.ticket();
    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(this.resolveUrl(realtimeUrl, ticket));
      this.socket = socket;
      let acknowledged = false;
      socket.onmessage = (event) => {
        let message: ServerMessage;
        try { message = JSON.parse(String(event.data)) as ServerMessage; } catch { return; }
        if (message.type === 'connected') {
          this.playerId = message.playerId;
          acknowledged = true;
          this.attempts = 0;
          this.set('open');
          resolve();
        }
        this.onMessage(message);
      };
      socket.onerror = () => { if (!acknowledged) reject(new Error('Online play is unavailable right now.')); };
      socket.onclose = (event) => {
        if (this.socket !== socket) return;
        this.socket = undefined;
        if (!acknowledged) { reject(new Error(event.code === 4401 ? 'Your session ticket expired. Try again.' : 'Online play is unavailable right now.')); return; }
        if (this.keepAlive && this.attempts < 6) {
          this.attempts++;
          this.set('reconnecting');
          this.timer = window.setTimeout(() => this.connect().catch(() => this.set('closed')), 500 * 2 ** this.attempts);
        } else this.set('closed');
      };
    });
  }

  send(message: Record<string, unknown>): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }

  close(): void {
    this.keepAlive = false;
    clearTimeout(this.timer);
    const socket = this.socket;
    this.socket = undefined;
    socket?.close();
    this.set('closed');
  }

  private set(status: RealtimeStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.onStatus(status);
  }
}
