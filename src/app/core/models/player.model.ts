export interface PlayerProfile {
  segment: string;
  id: string;
  username: string;
  avatarUrl: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
}

export interface PlayerProgress {
  totalGamesPlayed: number;
  totalScore: number;
  highScore: number;
  completedGameIds: string[];
  completedWorldIds: string[];
}

export interface HeroItem {
  heroId: string;
  worldId: string;
  name: string;
  unlockedAt: string; // ISO 8601
}

export interface PlayerInventory {
  heroes: HeroItem[];
}
