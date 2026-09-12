export type GameDataValue = string | number | boolean | null | GameDataValue[] | { [key: string]: GameDataValue };
export type GameData = { [key: string]: GameDataValue };

/** Common envelope; each game owns the schema of state and rules. */
export interface GameBootstrap<TState extends GameData = GameData, TRules extends GameData = GameData> {
  schemaVersion: 1;
  gameId: string;
  playerId: string;
  progress: { gamesPlayed: number; bestScore: number; state: TState };
  settings: { soundEnabled: boolean; musicEnabled: boolean; rules: TRules };
}
