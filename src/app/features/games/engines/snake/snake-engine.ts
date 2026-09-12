import { GameEngine, GameState } from '../base/game-engine.interface';
import { SnakeItem, SnakeItemId, SnakeLevel } from '../../../../core/models/snake.model';
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export interface SnakeCell { x: number; y: number; }
export interface SnakeState extends GameState {
  snake: SnakeCell[]; food: SnakeCell & { item: SnakeItem }; direction: Direction;
  gridSize: number; dead: boolean; won: boolean; collected: SnakeItemId[]; elapsedMs: number; tickMs: number; target: number; winLength: number;
}
const OPPOSITE: Record<Direction, Direction> = { UP:'DOWN', DOWN:'UP', LEFT:'RIGHT', RIGHT:'LEFT' };
const VECTOR: Record<Direction, SnakeCell> = { UP:{x:0,y:-1}, DOWN:{x:0,y:1}, LEFT:{x:-1,y:0}, RIGHT:{x:1,y:0} };
export class SnakeEngine implements GameEngine<SnakeState> {
  state!: SnakeState;
  private level!: SnakeLevel;
  private items!: SnakeItem[];
  private accumulator = 0;
  private queue: Direction[] = [];
  constructor(private readonly random: () => number = Math.random) {}
  init(config?: Record<string, unknown>): void {
    this.level = config?.['level'] as SnakeLevel;
    this.items = config?.['items'] as SnakeItem[];
    if (!this.level || this.level.gridSize < 6 || !this.items?.length) throw new Error('Snake rules are missing');
    const center = Math.floor(this.level.gridSize / 2);
    this.queue = []; this.accumulator = 0;
    this.state = { snake:Array.from({length:this.level.initialLength},(_,i)=>({x:center-i,y:center})),
      food:{x:0,y:0,item:this.items[0]}, direction:'RIGHT', gridSize:this.level.gridSize,
      score:0,running:false,tick:0,dead:false,won:false,collected:[],elapsedMs:0,tickMs:this.level.tickMs,target:this.level.target,winLength:this.level.winLength ?? this.level.initialLength + this.level.target };
    this.spawnFood();
  }
  setDirection(direction: Direction): void {
    if (this.state.dead || this.state.won || !this.state.running || this.queue.length >= 2) return;
    const last = this.queue.at(-1) ?? this.state.direction;
    if (direction !== OPPOSITE[last] && direction !== last) this.queue.push(direction);
  }
  start(): void { if (!this.state.dead && !this.state.won) this.state.running = true; }
  pause(): void { this.state.running = false; this.queue = []; this.accumulator = 0; }
  update(deltaMs: number): SnakeState {
    if (!this.state.running) return this.state;
    const delta = Math.min(250, Math.max(0, deltaMs));
    this.state.elapsedMs += delta; this.accumulator += delta;
    while (this.state.running && this.accumulator >= this.state.tickMs) {
      this.accumulator -= this.state.tickMs;
      this.step();
    }
    return this.state;
  }
  private step(): void {
    const s = this.state;
    s.direction = this.queue.shift() ?? s.direction;
    const d = VECTOR[s.direction], head = {x:s.snake[0].x+d.x,y:s.snake[0].y+d.y};
    const eats = head.x === s.food.x && head.y === s.food.y;
    const body = eats ? s.snake : s.snake.slice(0,-1);
    if (head.x<0 || head.y<0 || head.x>=s.gridSize || head.y>=s.gridSize || body.some(c=>c.x===head.x && c.y===head.y)) {
      s.dead = true; s.running = false; return;
    }
    s.snake.unshift(head); s.tick++;
    if (!eats) s.snake.pop();
    else {
      s.collected.push(s.food.item.id); s.score += s.food.item.points;
      s.tickMs = Math.max(this.level.minTickMs, this.level.tickMs - Math.floor(s.collected.length / this.level.speedUpEvery) * this.level.speedUpMs);
      if (s.snake.length >= s.winLength) { s.won=true; s.running=false; }
      else this.spawnFood();
    }
  }
  private spawnFood(): void {
    const s=this.state, free:SnakeCell[]=[];
    for(let y=0;y<s.gridSize;y++)for(let x=0;x<s.gridSize;x++)if(!s.snake.some(c=>c.x===x&&c.y===y))free.push({x,y});
    const cell=free[Math.min(free.length-1, Math.floor(this.random()*free.length))];
    if (!cell) {s.won=true;s.running=false;return;}
    s.food={...cell,item:this.items[s.collected.length % this.items.length]};
  }
  reset(): void { this.init({level:this.level,items:this.items}); }
  destroy(): void { this.pause(); }
}
