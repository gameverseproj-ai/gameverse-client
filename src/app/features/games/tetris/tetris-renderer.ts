import { COLORS,TetrisEngine } from './tetris-engine';
export class TetrisRenderer {
 constructor(private readonly ctx:CanvasRenderingContext2D){}
 render(engine:TetrisEngine,flash=0):void {
  const c=this.ctx,w=300,h=600,cw=w/engine.rules.columns,ch=h/engine.rules.rows;
  c.clearRect(0,0,w,h);c.fillStyle='#292342';c.fillRect(0,0,w,h);
  for(let y=0;y<engine.rules.rows;y++)for(let x=0;x<engine.rules.columns;x++){
   c.fillStyle=(x+y)%2?'#493c632e':'#6d568126';c.fillRect(x*cw+1,y*ch+1,cw-2,ch-2);
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
  const gradient=c.createLinearGradient(x,y,x+w,y+h);gradient.addColorStop(0,'#fff3');gradient.addColorStop(1,'#0002');
  c.fillStyle=color;c.beginPath();c.roundRect(x+1.5,y+1.5,w-3,h-3,Math.min(7,w/4));c.fill();c.fillStyle=gradient;c.fill();
  c.strokeStyle='#ffffff70';c.lineWidth=1;c.stroke();c.fillStyle='#ffffff40';c.beginPath();c.roundRect(x+5,y+4,w-10,4,2);c.fill();
 }
}
