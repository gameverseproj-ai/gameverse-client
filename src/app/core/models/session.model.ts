export interface GameSession {
  sessionId: string;
  gameId: string;
  startedAt: string; // ISO 8601
}

export interface GameResult {
  score: number;
  durationSeconds: number;
  metadata?: Record<string, unknown>;
}

export interface FinishedGameSession {
  sessionId: string;
  gameId: string;
  score: number;
  xpEarned: number;
  coinsEarned: number;
}
