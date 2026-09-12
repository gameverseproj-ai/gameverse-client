import { TetrisBootstrap,TetrisReceipt,TetrisResult,TetrisRules,TetrisRun } from '../../models/tetris.model';
export const TETRIS_STORAGE_KEY='gameverse.tetris.player-001.v1';
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const rules=():TetrisRules=>({columns:10,rows:20,startingLevel:1,gravityMs:1000,minGravityMs:100,speedFactor:.82,linesPerLevel:10,lockDelayMs:500,maxLockResets:15,pointsPerLine:10,levelBonus:50});
type Saved={version:1;rules:TetrisRules;level:number;lines:number;balance:number;bestScore:number;gamesPlayed:number;sound:boolean;runs:Record<string,{run:TetrisRun;receipt?:TetrisReceipt;abandoned?:boolean}>};
const fresh=():Saved=>({version:1,rules:rules(),level:1,lines:0,balance:0,bestScore:0,gamesPlayed:0,sound:true,runs:{}});
export class TetrisMockServer {
 private memory=fresh();
 constructor(private readonly storage?:Pick<Storage,'getItem'|'setItem'>){}
 private read():Saved {const raw=this.storage?.getItem(TETRIS_STORAGE_KEY),data:Saved=raw?JSON.parse(raw):clone(this.memory);if(data.version!==1||!data.rules||!data.runs||!Number.isSafeInteger(data.balance)||data.balance<0||!Number.isSafeInteger(data.level)||data.level<1)throw new Error('Saved factory data is unavailable');return data;}
 private write(data:Saved){this.storage?.setItem(TETRIS_STORAGE_KEY,JSON.stringify(data));this.memory=clone(data);}
 private bootstrap(data:Saved):TetrisBootstrap {return clone({schemaVersion:1,gameId:'tetris',playerId:'player-001',progress:{gamesPlayed:data.gamesPlayed,bestScore:data.bestScore,state:{currentLevel:data.level,totalLines:data.lines,tetrisPoints:data.balance,segment:'jelly-pioneers'}},settings:{soundEnabled:data.sound,musicEnabled:false,rules:{...data.rules,startingLevel:data.level}}});}
 getBootstrap(){const data=this.read();this.write(data);return this.bootstrap(data);}
 startRun(id:string):TetrisRun {
  if(!/^[\w-]{8,100}$/.test(id))throw new Error('Invalid request ID');
  const data=this.read();if(Object.hasOwn(data.runs,id)){const existing=data.runs[id];if(existing.receipt||existing.abandoned)throw new Error('Run has ended');return clone(existing.run);}
  for(const record of Object.values(data.runs))if(!record.receipt)record.abandoned=true;
  const run:TetrisRun={id,seed:Math.floor(Math.random()*4294967295)+1,rules:{...data.rules,startingLevel:data.level},segment:'jelly-pioneers'};
  data.runs[id]={run};this.write(data);return clone(run);
 }
 finishRun(result:TetrisResult):TetrisReceipt {
  const data=this.read(),record=Object.hasOwn(data.runs,result.runId)?data.runs[result.runId]:undefined;
  if(!record||record.abandoned)throw new Error('Run unavailable');if(record.receipt)return clone(record.receipt);
  if(!Array.isArray(result.clears)||result.clears.length>10000||result.clears.some(n=>!Number.isInteger(n)||n<1||n>4)||![result.softDropCells,result.hardDropCells].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000)||!Number.isFinite(result.elapsedMs)||result.elapsedMs<0)throw new Error('Invalid result');
  const config=record.run.rules;let lines=0,score=result.softDropCells+result.hardDropCells*2;
  for(const cleared of result.clears){score+=[0,100,300,500,800][cleared]*(config.startingLevel+Math.floor(lines/config.linesPerLevel));lines+=cleared;}
  const gainedLevels=Math.floor(lines/config.linesPerLevel),level=config.startingLevel+gainedLevels;
  const earned=lines*config.pointsPerLine+gainedLevels*config.levelBonus;
  data.balance+=earned;data.lines+=lines;data.level=Math.max(data.level,level);data.bestScore=Math.max(data.bestScore,score);data.gamesPlayed++;
  const receipt:TetrisReceipt={runId:result.runId,score,earned,balance:data.balance,level,lines,bootstrap:this.bootstrap(data)};
  record.receipt=receipt;this.write(data);return clone(receipt);
 }
 saveSound(enabled:boolean){if(typeof enabled!=='boolean')throw new Error('Invalid preference');const data=this.read();data.sound=enabled;this.write(data);return this.bootstrap(data);}
}
