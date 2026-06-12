import { GameRenderer, RenderContext } from '../base/game-renderer.interface';
import { SnakeState } from './snake-engine';

export interface SnakeTheme {
  background: string;
  snakeHead: string;
  snakeBody: string;
  food: string;
  gridLine: string;
}

const THEMES: Record<string, SnakeTheme> = {
  retro: {
    background: '#0a0a0a',
    snakeHead: '#00ff41',
    snakeBody: '#007a20',
    food: '#ff4500',
    gridLine: '#111111',
  },
  pastel: {
    background: '#fdf6e3',
    snakeHead: '#859900',
    snakeBody: '#b8c200',
    food: '#dc322f',
    gridLine: '#eee8d5',
  },
  cyberpunk: {
    background: '#0d0d1a',
    snakeHead: '#f0ff00',
    snakeBody: '#808800',
    food: '#ff00ff',
    gridLine: '#1a1a2e',
  },
};

export class SnakeRenderer implements GameRenderer<SnakeState> {
  private context!: RenderContext;
  private theme: SnakeTheme = THEMES['retro'];

  init(context: RenderContext): void {
    this.context = context;
  }

  render(state: SnakeState): void {
    const { ctx, width, height } = this.context;
    const cellSize = width / state.gridSize;

    ctx.fillStyle = this.theme.background;
    ctx.fillRect(0, 0, width, height);

    this.drawGrid(state.gridSize, cellSize);
    this.drawFood(state.food, cellSize);
    this.drawSnake(state.snake, cellSize);
  }

  async loadTheme(themeName: string): Promise<void> {
    this.theme = THEMES[themeName] ?? THEMES['retro'];
  }

  destroy(): void {}

  private drawGrid(gridSize: number, cellSize: number): void {
    const { ctx, width, height } = this.context;
    ctx.strokeStyle = this.theme.gridLine;
    ctx.lineWidth = 0.5;

    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(width, i * cellSize);
      ctx.stroke();
    }
  }

  private drawFood(food: { x: number; y: number }, cellSize: number): void {
    const { ctx } = this.context;
    ctx.fillStyle = this.theme.food;
    ctx.beginPath();
    ctx.arc(
      food.x * cellSize + cellSize / 2,
      food.y * cellSize + cellSize / 2,
      cellSize / 2.5,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  private drawSnake(snake: { x: number; y: number }[], cellSize: number): void {
    const { ctx } = this.context;
    const padding = 1;

    snake.forEach((cell, index) => {
      ctx.fillStyle = index === 0 ? this.theme.snakeHead : this.theme.snakeBody;
      ctx.fillRect(
        cell.x * cellSize + padding,
        cell.y * cellSize + padding,
        cellSize - padding * 2,
        cellSize - padding * 2
      );
    });
  }
}
