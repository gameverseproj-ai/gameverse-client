import { Tetromino, TetrisRules } from '../../../core/models/tetris.model';
export const SHAPES:Record<Tetromino,number[][]>={
 I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], O:[[1,1],[1,1]],
 T:[[0,1,0],[1,1,1],[0,0,0]], S:[[0,1,1],[1,1,0],[0,0,0]], Z:[[1,1,0],[0,1,1],[0,0,0]],
 J:[[1,0,0],[1,1,1],[0,0,0]], L:[[0,0,1],[1,1,1],[0,0,0]],
};
export const PIECES=Object.keys(SHAPES) as Tetromino[];
export const COLORS:Record<Tetromino,string>={I:'#63dcf0',O:'#ffdc70',T:'#c19bff',S:'#84e4b1',Z:'#ff91b5',J:'#7dacf7',L:'#ffb580'};
export type FallingPiece={type:Tetromino;matrix:number[][];x:number;y:number};
export class TetrisEngine {
 board:(Tetromino|null)[][];
 current!:FallingPiece;
 queue:Tetromino[]=[];
 held:Tetromino|null=null;
 canHold=true;
 gameOver=false;
 paused=true;
 score=0; lines=0; clears:number[]=[]; softDropCells=0; hardDropCells=0; elapsedMs=0;
 revision=0; locks=0; lastClear:number[]=[]; clearSerial=0;
 private gravity=0; private groundedMs=0; private resets=0; private randomState:number;
 constructor(readonly rules:TetrisRules,seed:number){
  this.randomState=seed>>>0||1;
  this.board=Array.from({length:rules.rows},()=>Array<Tetromino|null>(rules.columns).fill(null));
  this.fillQueue();this.spawn();
 }
 get level(){return this.rules.startingLevel+Math.floor(this.lines/this.rules.linesPerLevel);}
 get interval(){return Math.max(this.rules.minGravityMs,this.rules.gravityMs*this.rules.speedFactor**(this.level-1));}
 private random(){let x=this.randomState;x^=x<<13;x^=x>>>17;x^=x<<5;this.randomState=x>>>0;return this.randomState/4294967296;}
 private fillQueue(){while(this.queue.length<7){const bag=[...PIECES];for(let i=bag.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}this.queue.push(...bag);}}
 private spawn(type?:Tetromino){
  const next=type??this.queue.shift()!;this.fillQueue();const matrix=SHAPES[next].map(row=>[...row]);
  this.current={type:next,matrix,x:Math.floor((this.rules.columns-matrix.length)/2),y:0};
  this.gravity=0;this.groundedMs=0;this.resets=0;this.revision++;
  if(!this.fits(this.current)){this.gameOver=true;this.paused=true;}
 }
 fits(piece:FallingPiece):boolean {return piece.matrix.every((row,y)=>row.every((v,x)=>!v||(piece.x+x>=0&&piece.x+x<this.rules.columns&&piece.y+y>=0&&piece.y+y<this.rules.rows&&!this.board[piece.y+y][piece.x+x])));}
 private supported(){return !this.fits({...this.current,y:this.current.y+1});}
 private resetLock(wasSupported:boolean){if(wasSupported&&this.resets<this.rules.maxLockResets){this.groundedMs=0;this.resets++;}}
 move(dx:number):boolean {
  if(this.paused||this.gameOver)return false;
  const next={...this.current,x:this.current.x+dx};if(!this.fits(next))return false;
  const grounded=this.supported();this.current=next;this.resetLock(grounded);this.revision++;return true;
 }
 rotate(counterclockwise=false):boolean {
  if(this.paused||this.gameOver||this.current.type==='O')return false;
  const m=this.current.matrix,n=m.length;
  const matrix=Array.from({length:n},(_,y)=>Array.from({length:n},(_,x)=>counterclockwise?m[x][n-1-y]:m[n-1-x][y]));
  // Small wall/floor kicks keep turns usable alongside walls and stacks.
  for(const [dx,dy] of [[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1],[0,-2]]){
   const next={...this.current,matrix,x:this.current.x+dx,y:this.current.y+dy};
   if(this.fits(next)){const grounded=this.supported();this.current=next;this.resetLock(grounded);this.revision++;return true;}
  }return false;
 }
 softDrop():boolean {
  if(this.paused||this.gameOver)return false;
  if(!this.fits({...this.current,y:this.current.y+1}))return false;
  this.current.y++;this.softDropCells++;this.score++;this.gravity=0;this.revision++;return true;
 }
 ghostY():number {let y=this.current.y;while(this.fits({...this.current,y:y+1}))y++;return y;}
 hardDrop():void {if(this.paused||this.gameOver)return;const y=this.ghostY(),distance=y-this.current.y;this.current.y=y;this.hardDropCells+=distance;this.score+=distance*2;this.lock();}
 hold():void {
  if(this.paused||this.gameOver||!this.canHold)return;
  const type=this.current.type,held=this.held;this.held=type;this.spawn(held??undefined);this.canHold=false;
 }
 start(){if(!this.gameOver)this.paused=false;}
 pause(){this.paused=true;}
 update(delta:number):void {
  if(this.paused||this.gameOver)return;
  // Small steps preserve lock timing, without teleporting after tab/CPU stalls.
  let remaining=Math.min(250,Math.max(0,delta));
  while(remaining>0&&!this.gameOver){
   const step=Math.min(10,remaining);remaining-=step;this.elapsedMs+=step;
   this.gravity+=step;
   if(this.gravity>=this.interval){this.gravity-=this.interval;if(this.fits({...this.current,y:this.current.y+1})){this.current.y++;this.revision++;}}
   if(this.supported()){this.groundedMs+=step;if(this.groundedMs>=this.rules.lockDelayMs)this.lock();}
   else this.groundedMs=0;
  }
 }
 private lock():void {
  this.current.matrix.forEach((row,y)=>row.forEach((v,x)=>{if(v)this.board[this.current.y+y][this.current.x+x]=this.current.type;}));
  const full=this.board.map((row,i)=>row.every(Boolean)?i:-1).filter(i=>i>=0);
  this.lastClear=full;
  if(full.length){this.clears.push(full.length);this.score += [0,100,300,500,800][full.length]*this.level;this.lines+=full.length;this.clearSerial++;
   this.board=this.board.filter((_,i)=>!full.includes(i));while(this.board.length<this.rules.rows)this.board.unshift(Array<Tetromino|null>(this.rules.columns).fill(null));}
  this.locks++;this.canHold=true;this.spawn();
 }
}
