export interface GameState {
  score: number;
  running: boolean;
  tick: number;
}

export interface GameEngine<TState extends GameState = GameState> {
  readonly state: TState;
  init(config?: Record<string, unknown>): void;
  update(deltaMs: number): TState;
  reset(): void;
  destroy(): void;
}
