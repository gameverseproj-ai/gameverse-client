export type GameId = string;
export type GameEngineType = 'snake' | 'tetris' | 'platformer' | '2048' | 'power';

export interface Game {
  id: GameId;
  title: string;
  description: string;
  worldId: string;
  thumbnailUrl: string;
  engineType: GameEngineType;
}

export interface GameScore {
  gameId: GameId;
  userId: string;
  score: number;
  timestamp: Date;
}
