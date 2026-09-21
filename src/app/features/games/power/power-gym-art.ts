/** A candy-stone training hall, matching the orange Power Gym in the world. */
export function drawPowerGym(c: CanvasRenderingContext2D, w: number, h: number): void {
  c.save();
  const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#211d4e');sky.addColorStop(.65,'#704560');sky.addColorStop(1,'#372c54');
  c.fillStyle=sky;c.fillRect(0,0,w,h);
  const glow=c.createRadialGradient(w/2,h*.35,5,w/2,h*.35,w*.55);glow.addColorStop(0,'#ffb88135');glow.addColorStop(1,'#ffb88100');c.fillStyle=glow;c.fillRect(0,0,w,h);
  // Rounded masonry and a luminous arch give the hall an interior of its own.
  const archW=Math.min(w*.55,270),left=(w-archW)/2,top=h*.13;
  c.lineWidth=16;c.strokeStyle='#93627b';c.beginPath();c.moveTo(left,h*.73);c.lineTo(left,top+archW/2);c.arc(w/2,top+archW/2,archW/2,Math.PI,0);c.lineTo(left+archW,h*.73);c.stroke();
  c.lineWidth=3;c.strokeStyle='#ffcf98';c.shadowColor='#ff9e73';c.shadowBlur=15;c.stroke();c.shadowBlur=0;
  for(const side of [0,1]) {
    const x=side?w-50:14;
    for(let y=54;y<h*.72;y+=39) {
      const stone=c.createLinearGradient(x,y,x+34,y+34);stone.addColorStop(0,'#b77f8d');stone.addColorStop(1,'#704c70');
      c.fillStyle=stone;c.beginPath();c.roundRect(x,y,36,33,8);c.fill();c.strokeStyle='#f7b69b55';c.lineWidth=1;c.stroke();
    }
    const lampX=side?w-70:70;
    c.shadowColor='#ffae64';c.shadowBlur=18;c.fillStyle='#ffd490';c.beginPath();c.roundRect(lampX-7,h*.29,14,25,7);c.fill();c.shadowBlur=0;
    c.fillStyle='#664766';c.beginPath();c.roundRect(lampX-11,h*.29+24,22,6,3);c.fill();
  }
  c.fillStyle='#403154';c.beginPath();c.moveTo(0,h*.74);c.quadraticCurveTo(w/2,h*.65,w,h*.74);c.lineTo(w,h);c.lineTo(0,h);c.closePath();c.fill();
  for(let i=0;i<7;i++) {c.beginPath();c.moveTo(w/2,h*.69);c.lineTo((i-1)*w/4,h);c.strokeStyle='#a88cb329';c.lineWidth=1;c.stroke();}
  for(const y of [.79,.88,.99]){c.beginPath();c.moveTo(0,h*y);c.lineTo(w,h*y);c.strokeStyle='#aa8ab62e';c.stroke();}
  c.beginPath();c.ellipse(w/2,h*.8,w*.34,h*.075,0,0,Math.PI*2);c.strokeStyle='#ffc58c';c.lineWidth=3;c.shadowColor='#fc9569';c.shadowBlur=13;c.stroke();
  c.restore();
}
