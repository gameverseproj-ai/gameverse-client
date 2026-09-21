import { COLORS,TetrisEngine } from './tetris-engine';
export class TetrisRenderer {
 constructor(private readonly ctx:CanvasRenderingContext2D){}
 render(engine:TetrisEngine,flash=0):void {
  const c=this.ctx,w=300,h=600,cw=w/engine.rules.columns,ch=h/engine.rules.rows;
  c.clearRect(0,0,w,h);const sky=c.createLinearGradient(0,0,w,h);sky.addColorStop(0,'#201944');sky.addColorStop(.6,'#302256');sky.addColorStop(1,'#453061');c.fillStyle=sky;c.fillRect(0,0,w,h);
  for(let y=0;y<engine.rules.rows;y++)for(let x=0;x<engine.rules.columns;x++){
   c.fillStyle=(x+y)%2?'#b395ee0b':'#b395ee15';c.beginPath();c.roundRect(x*cw+1,y*ch+1,cw-2,ch-2,4);c.fill();
   const type=engine.board[y][x];if(type)this.block(x*cw,y*ch,cw,ch,COLORS[type]);
  }
  if(!engine.gameOver){const p=engine.current,ghost=engine.ghostY();
   p.matrix.forEach((row,y)=>row.forEach((v,x)=>{if(v){
    c.strokeStyle=COLORS[p.type]+'88';c.lineWidth=1.5;c.beginPath();c.roundRect((p.x+x)*cw+3,(ghost+y)*ch+3,cw-6,ch-6,5);c.stroke();
   }}));
   p.matrix.forEach((row,y)=>row.forEach((v,x)=>{if(v)this.block((p.x+x)*cw,(p.y+y)*ch,cw,ch,COLORS[p.type]);}));
  }
  if(flash>0){c.fillStyle=`rgba(235,222,255,${flash*.7})`;for(const row of engine.lastClear)c.fillRect(0,row*ch,w,ch);}
 }
 private block(x:number,y:number,w:number,h:number,color:string){const c=this.ctx;
  const gradient=c.createLinearGradient(x,y,x+w,y+h);gradient.addColorStop(0,'#ffffff65');gradient.addColorStop(.4,'#ffffff0a');gradient.addColorStop(1,'#35154d55');
  c.fillStyle=color;c.beginPath();c.roundRect(x+1.5,y+1.5,w-3,h-3,Math.min(7,w/4));c.fill();c.fillStyle=gradient;c.fill();
  c.strokeStyle='#ffffff90';c.lineWidth=1;c.stroke();c.fillStyle='#ffffff60';c.beginPath();c.roundRect(x+5,y+4,w-10,4,2);c.fill();c.fillStyle='#fff9';c.beginPath();c.arc(x+6,y+7,1.5,0,Math.PI*2);c.fill();
 }
}
