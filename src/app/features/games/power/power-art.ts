/** Resolution-independent glove art for first-person boxing. */
export class PowerArt {
  constructor(private readonly c: CanvasRenderingContext2D) {}
  private gradient(x: number, y: number, x2: number, y2: number, colors: string[]): CanvasGradient {
    const g = this.c.createLinearGradient(x,y,x2,y2); colors.forEach((color,i) => g.addColorStop(i/(colors.length-1),color)); return g;
  }
  private shape(path: string, fill: string | CanvasGradient, stroke?: string): void {
    const p=new Path2D(path);this.c.fillStyle=fill;this.c.fill(p);
    if(stroke){this.c.strokeStyle=stroke;this.c.lineWidth=1.4;this.c.stroke(p);}
  }
  private stroke(points:number[][],color:string,width:number):void{
    const c=this.c;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();
  }
  glove(x:number,y:number,scale:number,left=false,angle=0,forearm=true):void{
    const c=this.c;c.save();c.translate(x,y);c.rotate(angle);c.scale(left?-scale:scale,scale);
    c.shadowColor='#07101666';c.shadowBlur=15;c.shadowOffsetY=9;
    // Tapered forearm, wrapped wrist and sculpted leather knuckle shell.
    if (forearm) this.shape('M -25 57 Q -28 105 -43 155 L 43 155 Q 29 106 28 57 Z',this.gradient(-35,80,40,100,['#92553c','#f1bc90','#c77c56']));
    c.shadowBlur=0;c.shadowOffsetY=0;
    this.shape('M -28 57 L 30 57 L 32 95 Q 1 106 -31 94 Z',this.gradient(-30,0,32,0,['#b4c3bb','#f6f2d9','#cbd4c7']),'#718c85');
    for(let i=0;i<4;i++)this.stroke([[-29,68+i*7],[30,73+i*6]],'#859e974f',1.5);
    c.shadowColor='#08111966';c.shadowBlur=10;c.shadowOffsetY=4;
    this.shape('M -34 46 C -51 27 -57 1 -53 -30 C -51 -58 -32 -73 -4 -74 C 30 -78 52 -61 57 -37 C 62 -8 54 22 39 46 L 29 63 L -23 63 Z',this.gradient(-48,-65,53,50,['#faad82','#e95c43','#a32d35']),'#7c2932');
    c.shadowBlur=0;c.shadowOffsetY=0;
    this.shape('M -40 -6 C -63 -13 -70 2 -65 24 C -63 40 -51 51 -36 49 L -20 34 C -15 22 -20 11 -32 10 Z',this.gradient(-66,0,-17,42,['#f29167','#c74338','#8e2933']),'#9d3435');
    this.shape('M -43 -37 C -35 -62 -8 -65 18 -58 C 33 -54 41 -44 43 -35 C 15 -46 -16 -46 -43 -28 Z','#ffd4a052');
    this.stroke([[-38,-27],[-11,-34],[18,-31],[40,-24]],'#8d30323d',2);
    this.stroke([[-35,9],[-28,17],[-24,29]],'#ffb38888',2);
    this.shape('M -29 45 Q 4 52 37 43 L 32 73 Q 1 80 -30 70 Z',this.gradient(-30,45,35,75,['#253d47','#15252e']),'#0e2028');
    this.stroke([[-23,53],[27,53]],'#b0c9b742',1);
    this.shape('M -10 54 L 9 54 L 3 61 L 11 61 L -6 72 L -2 63 L -12 63 Z','#dfedbb');
    // Fine seam and stitch marks follow the cuff instead of floating on the wrist.
    for(let i=0;i<7;i++)this.stroke([[-23+i*8,67],[-21+i*8,68]],'#c3d0b75c',1);
    c.restore();
  }
}
