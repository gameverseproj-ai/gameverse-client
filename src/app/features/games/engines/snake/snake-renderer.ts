import { GameRenderer, RenderContext } from '../base/game-renderer.interface';
import { SnakeState } from './snake-engine';
import { SnakeItemId } from '../../../../core/models/snake.model';

/** Code-drawn jelly art stays crisp at every board size, without image downloads. */
export class SnakeRenderer implements GameRenderer<SnakeState> {
  private context!: RenderContext;
  init(context: RenderContext): void { this.context=context; }
  render(s:SnakeState):void {
    const {ctx:c,width:w,height:h}=this.context, cell=w/s.gridSize;
    c.clearRect(0,0,w,h);
    const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#251e49');bg.addColorStop(1,'#151e38');
    c.fillStyle=bg;c.fillRect(0,0,w,h);
    for(let y=0;y<s.gridSize;y++)for(let x=0;x<s.gridSize;x++){
      c.fillStyle=(x+y)%2===0?'#ffffff04':'#ffffff09';c.fillRect(x*cell+1,y*cell+1,cell-2,cell-2);
    }
    this.drawItem(s.food.item.id,(s.food.x+.5)*cell,(s.food.y+.5)*cell,cell*.88);
    // Connected soft beads, with a brighter expressive head.
    c.lineJoin='round';c.lineCap='round';c.lineWidth=cell*.63;c.strokeStyle='#da479e';
    c.beginPath();s.snake.forEach((p,i)=>i?c.lineTo((p.x+.5)*cell,(p.y+.5)*cell):c.moveTo((p.x+.5)*cell,(p.y+.5)*cell));c.stroke();
    for(let i=s.snake.length-1;i>=0;i--){
      const p=s.snake[i],x=(p.x+.5)*cell,y=(p.y+.5)*cell;
      c.save();c.translate(x,y);
      const jelly=c.createRadialGradient(-cell*.13,-cell*.18,0,0,0,cell*.55);
      jelly.addColorStop(0,i===0?'#ffd1eb':'#ffa3d6');jelly.addColorStop(.45,i===0?'#fb82c4':'#f56ab6');jelly.addColorStop(1,'#b42e88');
      c.fillStyle=jelly;c.shadowColor='#f778c244';c.shadowBlur=cell*.25;
      c.beginPath();c.ellipse(0,0,cell*.43,cell*.42,0,0,Math.PI*2);c.fill();c.shadowBlur=0;
      c.fillStyle='#ffffff60';c.beginPath();c.ellipse(-cell*.13,-cell*.22,cell*.14,cell*.065,-.35,0,Math.PI*2);c.fill();
      if(i===0){
        const rotation={RIGHT:0,DOWN:Math.PI/2,LEFT:Math.PI,UP:-Math.PI/2}[s.direction];c.rotate(rotation);
        for(const side of [-1,1]){
          c.fillStyle='#372042';c.beginPath();c.ellipse(cell*.15,side*cell*.17,cell*.07,cell*.09,0,0,Math.PI*2);c.fill();
          c.fillStyle='#fff';c.beginPath();c.arc(cell*.17,side*cell*.17-cell*.025,cell*.025,0,Math.PI*2);c.fill();
        }
        c.strokeStyle='#6a2650';c.lineWidth=cell*.035;c.beginPath();c.arc(cell*.18,0,cell*.08,-.9,.9);c.stroke();
      }
      c.restore();
    }
  }
  private drawItem(id:SnakeItemId,x:number,y:number,size:number):void {
    const c=this.context.ctx;c.save();c.translate(x,y);c.scale(size,size);
    c.fillStyle='#9eead522';c.beginPath();c.ellipse(0,.32,.42,.15,0,0,Math.PI*2);c.fill();
    const box=(x:number,y:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,.055);c.fill();};
    if(id==='crystal'){
      for(const [x,y,k,color] of [[-.2,.04,.6,'#90ffe0'],[.17,.12,.5,'#88caff'],[0,-.12,1,'#c5a4ff']] as const){
        c.save();c.translate(x,y);c.scale(k,k);c.fillStyle=color;c.beginPath();c.moveTo(0,-.4);c.lineTo(.23,-.1);c.lineTo(.13,.35);c.lineTo(-.14,.35);c.lineTo(-.2,-.1);c.closePath();c.fill();c.strokeStyle='#ffffffaa';c.lineWidth=.025;c.beginPath();c.moveTo(0,-.4);c.lineTo(0,.35);c.stroke();c.restore();
      }
    } else if(id==='tree'){
      box(-.07,.1,.14,.3,'#bc7395');
      for(const [y,r,color] of [[.05,.32,'#7ce9c5'],[-.16,.24,'#9af6d8'],[-.32,.14,'#c6ffe7']] as const){c.fillStyle=color;c.beginPath();c.arc(0,y,r,0,Math.PI*2);c.fill();}
    } else if(id==='island'){
      c.fillStyle='#ad90dd';c.beginPath();c.moveTo(-.4,0);c.lineTo(.4,0);c.lineTo(.12,.42);c.closePath();c.fill();
      c.fillStyle='#9cecc5';c.beginPath();c.ellipse(0,0,.43,.14,0,0,Math.PI*2);c.fill();
      box(.13,0,.08,.32,'#93dbff');box(-.11,-.3,.15,.25,'#c2a0ff');
    } else {
      const color=id==='temple'?'#f7bd61':id==='factory'?'#bd8bff':'#ff9294';
      box(-.34,-.2,.68,.55,color);
      if(id==='temple'){box(-.27,-.32,.54,.16,'#ffda84');box(-.18,-.44,.36,.16,'#ffe9ad');}
      if(id==='factory'){box(-.28,-.47,.15,.3,'#bba2ff');box(.1,-.4,.17,.23,'#ecafff');box(-.3,-.52,.21,.09,'#98e8f0');}
      if(id==='gym'){box(-.19,-.39,.38,.2,'#ffd184');box(-.43,-.31,.86,.07,'#eec8ff');}
      box(-.105,.06,.21,.29,'#443454');box(-.27,-.08,.1,.1,'#fff0bd');box(.17,-.08,.1,.1,'#fff0bd');
      c.strokeStyle='#fff1cf';c.lineWidth=.025;c.beginPath();c.arc(0,.12,.11,Math.PI,0);c.stroke();
    }
    c.restore();
  }
  async loadTheme(_theme:string):Promise<void>{}
  destroy():void{}
}
