import { GameBootstrap } from './game-bootstrap.model';
export type Tetromino = 'I'|'O'|'T'|'S'|'Z'|'J'|'L';
export type TetrisRules = { columns:number; rows:number; startingLevel:number; gravityMs:number; minGravityMs:number; speedFactor:number; linesPerLevel:number; lockDelayMs:number; maxLockResets:number; pointsPerLine:number; levelBonus:number };
export type TetrisProgress = { currentLevel:number; totalLines:number; tetrisPoints:number; segment:string };
export type TetrisBootstrap = GameBootstrap<TetrisProgress,TetrisRules>;
export type TetrisRun = { id:string; seed:number; rules:TetrisRules; segment:string };
export type TetrisResult = {runId:string; clears:number[]; softDropCells:number; hardDropCells:number; elapsedMs:number};
export type TetrisReceipt = {runId:string;score:number;earned:number;balance:number;level:number;lines:number;bootstrap:TetrisBootstrap};
