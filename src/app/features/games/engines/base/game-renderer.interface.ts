import { GameState } from './game-engine.interface';

export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
}

export interface GameRenderer<TState extends GameState = GameState> {
  init(context: RenderContext): void;
  render(state: TState): void;
  loadTheme(themeName: string): Promise<void>;
  destroy(): void;
}
