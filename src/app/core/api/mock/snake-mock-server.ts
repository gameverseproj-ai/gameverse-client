import { SnakeBootstrap, SnakeFinishRequest, SnakeItem, SnakeLevel, SnakePreferences, SnakeReceipt, SnakeRun } from '../../models/snake.model';

export const SNAKE_STORAGE_KEY = 'gameverse.snake.player-001.v1';
export const FIRST_USER_SEGMENT = 'jelly-pioneers';
const ITEMS: SnakeItem[] = [
  { id: 'temple', name: 'Tiny temple', points: 15 }, { id: 'factory', name: 'Mini factory', points: 15 },
  { id: 'gym', name: 'Pocket gym', points: 15 }, { id: 'crystal', name: 'Jelly crystal', points: 20 },
  { id: 'tree', name: 'Candy tree', points: 10 }, { id: 'island', name: 'Floating island', points: 25 },
];
function level(id: number): SnakeLevel {
  const gridSize = 16, initialLength = 3, winLength = Math.ceil(gridSize * gridSize / 4);
  return { id, name: ['Soft start', 'Jelly trail', 'Crystal rush', 'Island dance'][Math.min(id - 1, 3)],
    gridSize, initialLength, winLength, speedUpEvery: 3,
    tickMs: Math.max(180, 600 - (id - 1) * 25), minTickMs: 140,
    speedUpMs: 22, target: winLength - initialLength, bonus: id * 30 };
}
type StoredRun = { run: SnakeRun; receipt?: SnakeReceipt; abandoned?: boolean };
type Save = { version: 1; currentLevel: number; totalCollected: number; gamesPlayed: number; bestScore: number; balance: number; settings: SnakePreferences; runs: Record<string, StoredRun> };
const fresh = (): Save => ({ version: 1, currentLevel: 1, totalCollected: 0, gamesPlayed: 0, bestScore: 0, balance: 0,
  settings: { soundEnabled: true, musicEnabled: false }, runs: {} });
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/** Mock server authority. Local storage stands in for a per-user database. */
export class SnakeMockServer {
  private memory = fresh();
  constructor(private readonly storage?: Pick<Storage, 'getItem' | 'setItem'>) {}
  private read(): Save {
    const raw = this.storage?.getItem(SNAKE_STORAGE_KEY);
    if (!raw) return clone(this.memory);
    const data: Save = JSON.parse(raw);
    if (data.version !== 1 || !Number.isSafeInteger(data.currentLevel) || data.currentLevel < 1 || !Number.isSafeInteger(data.balance) || data.balance < 0 || !data.runs || !data.settings) {
      throw new Error('Saved progress could not be read. Please try again.');
    }
    return data;
  }
  private write(data: Save): void {
    this.storage?.setItem(SNAKE_STORAGE_KEY, JSON.stringify(data));
    this.memory = clone(data);
  }
  private bootstrap(data: Save): SnakeBootstrap {
    return { schemaVersion: 1, gameId: 'snake', playerId: 'player-001',
      progress: { gamesPlayed: data.gamesPlayed, bestScore: data.bestScore, state: {
        currentLevel: data.currentLevel, completedLevels: data.currentLevel - 1,
        totalCollected: data.totalCollected, snakePoints: data.balance, segment: FIRST_USER_SEGMENT,
      } },
      settings: { ...data.settings, rules: { lives: 1, items: clone(ITEMS),
        levels: Array.from({length: 4}, (_, i) => level(data.currentLevel + i)) } },
    };
  }
  getBootstrap(): SnakeBootstrap { return this.bootstrap(this.read()); }
  startRun(requestId: string): SnakeRun {
    if (!/^[a-zA-Z0-9-]{8,100}$/.test(requestId)) throw new Error('Invalid start request');
    const data = this.read();
    const id = `snake-${requestId}`;
    if (Object.hasOwn(data.runs, id)) {
      const existing = data.runs[id];
      if (existing.abandoned || existing.receipt) throw new Error('This run has already ended');
      return clone(existing.run);
    }
    for (const previous of Object.values(data.runs)) if (!previous.receipt) previous.abandoned = true;
    const run: SnakeRun = { id, level: level(data.currentLevel), items: clone(ITEMS), lives: 1, segment: FIRST_USER_SEGMENT, startedAt: new Date().toISOString() };
    data.runs[id] = { run };
    this.write(data);
    return clone(run);
  }
  finishRun(result: SnakeFinishRequest): SnakeReceipt {
    const data = this.read();
    const record = Object.hasOwn(data.runs, result.runId) ? data.runs[result.runId] : undefined;
    if (!record || record.abandoned) throw new Error('Run is unavailable');
    if (record.receipt) return clone(record.receipt);
    // Use the run snapshot; older in-flight runs retain their original contract.
    const target = record.run.level.winLength === undefined ? record.run.level.target : record.run.level.winLength - record.run.level.initialLength;
    if (!['lost', 'won'].includes(result.outcome) || !Array.isArray(result.collected) || result.collected.length > target ||
        !Number.isFinite(result.elapsedMs) || result.elapsedMs < 0 ||
        result.collected.some(id => !record.run.items.some(item => item.id === id)) ||
        (result.outcome === 'won' && result.collected.length !== target)) throw new Error('Invalid run result');
    const points = result.collected.reduce((sum, id) => sum + record.run.items.find(item => item.id === id)!.points, 0);
    const bonus = result.outcome === 'won' ? record.run.level.bonus : 0;
    data.balance += points + bonus;
    data.gamesPlayed++;
    data.totalCollected += result.collected.length;
    data.bestScore = Math.max(data.bestScore, points + bonus);
    if (result.outcome === 'won') data.currentLevel = Math.max(data.currentLevel, record.run.level.id + 1);
    const receipt: SnakeReceipt = { runId: result.runId, outcome: result.outcome, earned: points + bonus,
      collectedPoints: points, bonus, balance: data.balance, nextLevel: data.currentLevel, bootstrap: this.bootstrap(data) };
    record.receipt = receipt;
    this.write(data); // Progress and wallet commit atomically before the response.
    return clone(receipt);
  }
  savePreferences(settings: SnakePreferences): SnakeBootstrap {
    if (typeof settings.soundEnabled !== 'boolean' || typeof settings.musicEnabled !== 'boolean') throw new Error('Invalid preferences');
    const data = this.read(); data.settings = { ...settings }; this.write(data); return this.bootstrap(data);
  }
}
