import { GameEngine, GameState } from '../base/game-engine.interface';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface SnakeCell {
  x: number;
  y: number;
}

export interface SnakeState extends GameState {
  snake: SnakeCell[];
  food: SnakeCell;
  direction: Direction;
  nextDirection: Direction;
  gridSize: number;
  dead: boolean;
}

const OPPOSITES: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};

export class SnakeEngine implements GameEngine<SnakeState> {
  state!: SnakeState;

  init(config?: Record<string, unknown>): void {
    const gridSize = (config?.['gridSize'] as number) ?? 20;
    this.state = {
      snake: [{ x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) }],
      food: this.spawnFood(gridSize, []),
      direction: 'RIGHT',
      nextDirection: 'RIGHT',
      gridSize,
      score: 0,
      running: false,
      tick: 0,
      dead: false,
    };
  }

  update(_deltaMs: number): SnakeState {
    return this.state;
  }

  setDirection(direction: Direction): void {
    if (direction !== OPPOSITES[this.state.direction]) {
      this.state.nextDirection = direction;
    }
  }

  reset(): void {
    this.init({ gridSize: this.state.gridSize });
  }

  destroy(): void {}

  private spawnFood(gridSize: number, occupied: SnakeCell[]): SnakeCell {
    let cell: SnakeCell;
    do {
      cell = {
        x: Math.floor(Math.random() * gridSize),
        y: Math.floor(Math.random() * gridSize),
      };
    } while (occupied.some((c) => c.x === cell.x && c.y === cell.y));
    return cell;
  }
}
