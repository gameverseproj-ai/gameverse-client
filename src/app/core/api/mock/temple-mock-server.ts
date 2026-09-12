import { TempleBootstrap, TempleLevel, TempleMove, TempleRun } from '../../models/temple.model';
import { slide, spawnTile, canMove } from '../../../features/games/temple/temple-engine';
export const TEMPLE_STORAGE_KEY = 'gameverse.temple.player-001.v1';
const clone = <T>(value:T):T => JSON.parse(JSON.stringify(value));
const levels = ():TempleLevel[] => Array.from({length:8}, (_,i) => ({id:i+1,
  name:['First light','Golden steps','Sacred chamber','Sunrise hall','The great temple','Crystal vault','Celestial gate','Infinite wisdom'][i],
  gridSize:4,targetTile:2**(7+i),initialTiles:2,fourChance:Math.min(.3,.1+i*.025),winPoints:(i+1)*100}));
type Save = { version:1; levels:TempleLevel[]; currentLevel:number; wins:number; balance:number; largestTile:number; bestScore:number; gamesPlayed:number; run:TempleRun|null; lastMove:TempleMove|null };
const fresh = ():Save => ({version:1,levels:levels(),currentLevel:1,wins:0,balance:0,largestTile:0,bestScore:0,gamesPlayed:0,run:null,lastMove:null});
/** Simulated per-user database. Every accepted move and any reward commit together. */
export class TempleMockServer {
  private memory = fresh();
  constructor(private readonly storage?: Pick<Storage,'getItem'|'setItem'>, private readonly random = Math.random) {}
  private read():Save {
    const raw=this.storage?.getItem(TEMPLE_STORAGE_KEY),data:Save=raw?JSON.parse(raw):clone(this.memory);
    if(data.version!==1||!Array.isArray(data.levels)||!data.levels.length||!Number.isSafeInteger(data.balance)||data.balance<0||!data.levels.some(l=>l.id===data.currentLevel))throw new Error('Saved temple data is unavailable');
    return data;
  }
  private write(data:Save):void {this.storage?.setItem(TEMPLE_STORAGE_KEY,JSON.stringify(data));this.memory=clone(data);}
  private response(data:Save):TempleBootstrap {
    return clone({schemaVersion:1,gameId:'2048',playerId:'player-001',progress:{gamesPlayed:data.gamesPlayed,bestScore:data.bestScore,state:{currentLevel:data.currentLevel,wins:data.wins,templePoints:data.balance,largestTile:data.largestTile,segment:'jelly-pioneers',run:data.run}},settings:{soundEnabled:true,musicEnabled:false,rules:{levels:data.levels}}});
  }
  getBootstrap():TempleBootstrap {const data=this.read();this.write(data);return this.response(data);}
  startRun(requestId:string):TempleBootstrap {
    if(!/^[\w-]{8,100}$/.test(requestId))throw new Error('Invalid request ID');
    const data=this.read();
    if(data.run?.status==='playing'||data.run?.id===requestId)return this.response(data);
    const level=clone(data.levels.find(l=>l.id===data.currentLevel)!);
    if(level.gridSize<3||level.gridSize>6||level.initialTiles<1||level.initialTiles>=level.gridSize**2||level.fourChance<0||level.fourChance>1||level.targetTile<8||!Number.isSafeInteger(level.winPoints)||level.winPoints<0)throw new Error('Invalid level configuration');
    const board=Array<number>(level.gridSize**2).fill(0);
    for(let i=0;i<level.initialTiles;i++)spawnTile(board,level.fourChance,this.random);
    data.run={id:requestId,level,board,score:0,revision:0,status:'playing',earned:0};data.lastMove=null;
    this.write(data);return this.response(data);
  }
  move(request:TempleMove):TempleBootstrap {
    const data=this.read(),run=data.run;
    if(!run||run.id!==request.runId)throw new Error('Run unavailable');
    if(data.lastMove?.requestId===request.requestId){
      if(data.lastMove.runId!==request.runId||data.lastMove.revision!==request.revision||data.lastMove.direction!==request.direction)throw new Error('Request ID reused');
      return this.response(data);
    }
    if(!/^[\w-]{8,100}$/.test(request.requestId)||run.status!=='playing'||run.revision!==request.revision||!['up','down','left','right'].includes(request.direction))throw new Error('Stale or invalid move');
    const result=slide(run.board,run.level.gridSize,request.direction);
    if(result.changed){run.board=result.board;run.score+=result.score;spawnTile(run.board,run.level.fourChance,this.random);}
    run.revision++;data.lastMove={...request};
    data.largestTile=Math.max(data.largestTile,...run.board);data.bestScore=Math.max(data.bestScore,run.score);
    if(run.board.some(v=>v>=run.level.targetTile)){
      run.status='won';run.earned=run.level.winPoints;data.balance+=run.earned;data.wins++;data.gamesPlayed++;
      data.currentLevel=Math.min(data.levels.length,run.level.id+1);
    }else if(!canMove(run.board,run.level.gridSize)){run.status='lost';data.gamesPlayed++;}
    this.write(data);return this.response(data);
  }
}
