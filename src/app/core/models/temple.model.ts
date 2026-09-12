import { GameBootstrap } from './game-bootstrap.model';
export type TempleDirection = 'up' | 'down' | 'left' | 'right';
export type TempleLevel = { id: number; name: string; gridSize: number; targetTile: number; initialTiles: number; fourChance: number; winPoints: number };
export type TempleRun = { id: string; level: TempleLevel; board: number[]; score: number; revision: number; status: 'playing' | 'won' | 'lost'; earned: number };
export type TempleProgress = { currentLevel: number; wins: number; templePoints: number; largestTile: number; segment: string; run: TempleRun | null };
export type TempleRules = { levels: TempleLevel[] };
export type TempleBootstrap = GameBootstrap<TempleProgress, TempleRules>;
export type TempleMove = { requestId: string; runId: string; revision: number; direction: TempleDirection };
