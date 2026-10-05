/** Public be-core leaderboard DTOs; ranking and rewards are authoritative. */
export interface LeaderboardPrize {
  rankFrom: number; rankTo: number; coins: number; gems: number; xp: number; label: string | null;
}
export interface LeaderboardStanding {
  rank: number; playerId: string; username: string | null; avatarUrl: string | null;
  score: number; results: number; you: boolean; prize: LeaderboardPrize | null;
}
export interface Leaderboard {
  gameId: string; title: string; enabled: boolean; mode: string; scoring: 'BEST_RUN' | 'TOTAL_POINTS';
  period: { key: string; startsAt: string; endsAt: string; settled: boolean };
  prizes: LeaderboardPrize[]; standings: LeaderboardStanding[]; you: LeaderboardStanding | null; players: number;
}
