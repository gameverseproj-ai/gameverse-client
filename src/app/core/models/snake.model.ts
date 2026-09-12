import { GameBootstrap } from './game-bootstrap.model';

export type SnakeItemId = 'temple' | 'factory' | 'gym' | 'crystal' | 'tree' | 'island';
export type SnakeItem = { id: SnakeItemId; name: string; points: number };
export type SnakeLevel = { id: number; name: string; gridSize: number; initialLength: number; speedUpEvery: number; tickMs: number; minTickMs: number; speedUpMs: number; target: number; winLength: number; bonus: number };
export type SnakeProgress = { currentLevel: number; completedLevels: number; totalCollected: number; snakePoints: number; segment: string };
export type SnakeRules = { lives: 1; levels: SnakeLevel[]; items: SnakeItem[] };
export type SnakeBootstrap = GameBootstrap<SnakeProgress, SnakeRules>;
export type SnakeRun = { id: string; level: SnakeLevel; items: SnakeItem[]; lives: 1; segment: string; startedAt: string };
export type SnakeOutcome = 'lost' | 'won';
export type SnakeFinishRequest = { runId: string; outcome: SnakeOutcome; collected: SnakeItemId[]; elapsedMs: number };
export type SnakeReceipt = { runId: string; outcome: SnakeOutcome; earned: number; collectedPoints: number; bonus: number; balance: number; nextLevel: number; bootstrap: SnakeBootstrap };
export type SnakePreferences = { soundEnabled: boolean; musicEnabled: boolean };
