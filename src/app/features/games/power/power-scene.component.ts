import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { punchZone } from './power-engine';
import { drawChallenger, ChallengerKind } from './power-challengers';
import { PowerArt } from './power-art';
import { Component, inject, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, afterNextRender, viewChild } from '@angular/core';
export type PunchGesture = { pull: number; aim: number; aimY: number; hand: 'left' | 'right' };
@Component({
  selector: 'app-power-scene', standalone: true, imports: [TranslatePipe],
  template: `<canvas #canvas tabindex="0" [attr.aria-label]="('First-person boxing. Grab either glove. A selects left, D selects right. Drag down to pull back, steer up, down, left or right, and release to punch. Keyboard: hold Space, aim with arrows, release Space.') | t" (pointerdown)="down($event)" (pointermove)="move($event)" (pointerup)="up($event)" (pointercancel)="cancel()" (lostpointercapture)="cancel()" (keydown)="keyDown($event)" (keyup)="keyUp($event)" (blur)="cancel()"></canvas>`,
  styles: [`:host{display:block}canvas{display:block;width:100%;height:430px;border-radius:18px;touch-action:none;outline:none;cursor:grab}canvas:active{cursor:grabbing}canvas:focus-visible{outline:3px solid #e4ff83;outline-offset:3px}@media(max-width:760px){canvas{height:390px}}`],
})
export class PowerSceneComponent implements OnChanges, OnDestroy {
  private readonly locale = inject(LanguageService);
  @Input() mode: 'battle' | 'machine' = 'battle';
  @Input() color = '#ff9855';
  @Input() eyes = '⌐ ⌐';
  @Input() mouth = '⌣';
  @Input() disabled = false;
  @Input() character: ChallengerKind = 'goose';
  @Output() punched = new EventEmitter<PunchGesture>();
  @Output() grabbed = new EventEmitter<void>();
  @Output() charge = new EventEmitter<number>();
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private raf = 0;
  private observer?: ResizeObserver;
  private ctx?: CanvasRenderingContext2D;
  private pointer: { id: number; x: number; y: number; aimAnchor?: number } | null = null;
  private hand: 'left' | 'right' = 'right';
  private shot: PunchGesture = { pull: 0, aim: 0, aimY: 0, hand: 'right' };
  private art?: PowerArt;
  private pull = 0;
  private aim = 0;
  private aimY = 0;
  private strikeAt = -10000;
  private keyAt = 0;
  private reduced = false;
  private width = 600;
  private height = 430;
  constructor() { afterNextRender(() => {
    const canvas = this.canvas()!.nativeElement; this.ctx = canvas.getContext('2d') ?? undefined;
    if (this.ctx) this.art = new PowerArt(this.ctx);
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.observer = new ResizeObserver(() => { const bounds = canvas.getBoundingClientRect(); this.width = bounds.width; this.height = bounds.height; const dpr = Math.min(devicePixelRatio, 2); canvas.width = bounds.width * dpr; canvas.height = bounds.height * dpr; this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0); });
    this.observer.observe(canvas);
    const frame = (now: number) => { this.draw(now); this.raf = requestAnimationFrame(frame); }; this.raf = requestAnimationFrame(frame);
  }); }
  ngOnChanges(): void { if (this.disabled) this.cancel(); }
  down(event: PointerEvent): void {
    if (this.disabled || this.pointer || event.button !== 0) return;
    const bounds = this.canvas()!.nativeElement.getBoundingClientRect();
    const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
    // Only a glove can be grabbed. Both gloves have equal, generous touch targets.
    const leftDistance = Math.abs(x - this.width * .2), rightDistance = Math.abs(x - this.width * .8);
    if (y < this.height * .63 || Math.min(leftDistance, rightDistance) > Math.min(85, this.width * .24)) return;
    this.hand = leftDistance < rightDistance ? 'left' : 'right';
    event.preventDefault(); this.canvas()!.nativeElement.focus({ preventScroll: true });
    this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; this.pull = 0; this.aim = 0; this.aimY = 0;
    this.canvas()!.nativeElement.setPointerCapture(event.pointerId); this.grabbed.emit();
  }
  move(event: PointerEvent): void {
    if (this.pointer?.id !== event.pointerId) return;
    this.pull = Math.max(this.pull, Math.min(1, Math.max(0, (event.clientY - this.pointer.y) / (this.height * .3))));
    // Retain the wind-up while the player steers vertically after pulling back.
    if (this.pointer.aimAnchor === undefined && this.pull >= .3) this.pointer.aimAnchor = event.clientY;
    if (this.pointer.aimAnchor !== undefined) this.aimY = Math.max(-1,Math.min(1,(event.clientY-this.pointer.aimAnchor)/(this.height*.22)));
    this.aim = Math.max(-1, Math.min(1, (event.clientX - this.pointer.x) / (this.width * .32)));
    this.charge.emit(this.pull);
  }
  up(event: PointerEvent): void { if (this.pointer?.id !== event.pointerId) return; this.move(event); this.release(); }
  keyDown(event: KeyboardEvent): void {
    if (this.disabled) return;
    if (!this.keyAt && ['KeyA', 'KeyD'].includes(event.code)) { event.preventDefault(); this.hand = event.code === 'KeyA' ? 'left' : 'right'; }
    if (event.code === 'Space') { event.preventDefault(); if (!event.repeat && !this.keyAt) { this.keyAt = performance.now(); this.aim = 0; this.aimY = 0; this.grabbed.emit(); } }
    if (this.keyAt && ['ArrowLeft', 'ArrowRight'].includes(event.code)) { event.preventDefault(); this.aim = Math.max(-1, Math.min(1, this.aim + (event.code === 'ArrowRight' ? .08 : -.08))); }
    if (this.keyAt && ['ArrowUp','ArrowDown'].includes(event.code)) { event.preventDefault(); this.aimY=Math.max(-1,Math.min(1,this.aimY+(event.code==='ArrowDown'?.08:-.08))); }
    if (event.code === 'Escape') this.cancel();
  }
  keyUp(event: KeyboardEvent): void { if (event.code === 'Space' && this.keyAt) { event.preventDefault(); this.pull = Math.min(1, (performance.now() - this.keyAt) / 1000); this.release(); } }
  private release(): void {
    const shot = { pull: this.pull, aim: this.aim, aimY: this.aimY, hand: this.hand };
    this.cancel();
    if (shot.pull < .08 || this.disabled) return;
    this.shot = shot; this.strikeAt = performance.now(); this.punched.emit(shot);
  }
  cancel(): void {
    const id = this.pointer?.id; this.pointer = null; this.keyAt = 0; this.pull = 0; this.charge.emit(0);
    const canvas = this.canvas()?.nativeElement;
    if (id !== undefined && canvas?.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }
  private line(points: number[][], color: string, width: number): void { const c = this.ctx!; c.beginPath(); points.forEach(([x,y],i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); }
  private ellipse(x: number,y: number,rx: number,ry: number,color: string | CanvasGradient): void { const c=this.ctx!;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill(); }
  private text(value: string,x: number,y: number,size: number,color='#e9f3dc'): void { const c=this.ctx!;c.fillStyle=color;c.font=`700 ${size}px system-ui`;c.textAlign='center';c.direction=this.locale.language()==='he'||this.locale.language()==='ar'?'rtl':'ltr';c.fillText(this.locale.t(value),x,y,this.width-20); }
  private draw(now: number): void {
    if (!this.ctx) return; const c=this.ctx,w=this.width,h=this.height;
    c.clearRect(0,0,w,h); const bg=c.createLinearGradient(0,0,0,h); bg.addColorStop(0,'#14252a');bg.addColorStop(1,'#3f5048');c.fillStyle=bg;c.fillRect(0,0,w,h);
    for(let i=0;i<7;i++)this.line([[w/2,h*.48],[(i-1)*w/4,h]],'#b5d2b514',1);
    this.line([[0,h*.75],[w,h*.75]],'#d5e0ba28',2);
    const elapsed=now-this.strikeAt, punching=elapsed<430;
    if (this.keyAt) { this.pull=Math.min(1,(now-this.keyAt)/1000);this.charge.emit(this.pull); }
    c.save();c.translate(w/2,h*.47);
    const currentAim = punching ? this.shot.aim : this.aim;
    const currentAimY=punching?this.shot.aimY:this.aimY;
    const landed=!!punchZone(currentAim,currentAimY);
    if(punching&&elapsed>120&&landed&&!this.reduced)c.rotate(Math.sin((elapsed-120)/310*Math.PI*2)*.09);
    const scale=Math.min(w/400,1.15);c.scale(scale,scale);
    this.ellipse(0,150,85,16,'#101c2466');this.line([[0,85],[0,136]],'#748184',20);this.ellipse(0,139,60,15,'#17282f');
    drawChallenger(c,this.mode==='machine'?'meter':this.character,punching&&elapsed>120&&landed);
    c.restore();
    const targetX=w/2+currentAim*124*scale,targetY=h*.47+currentAimY*115*scale;
    if(this.pointer||this.keyAt){c.strokeStyle=landed?'#dfff87':'#ff997e';c.lineWidth=2;c.beginPath();c.arc(targetX,targetY,16,0,Math.PI*2);c.stroke();this.line([[targetX-23,targetY],[targetX+23,targetY]],c.strokeStyle as string,1);this.line([[targetX,targetY-23],[targetX,targetY+23]],c.strokeStyle as string,1);}
    const flight=punching?Math.sin(Math.min(1,elapsed/430)*Math.PI):0;
    const selected = punching ? this.shot.hand : this.hand;
    const pulled = punching ? this.shot.pull : (this.pointer || this.keyAt ? this.pull : 0);
    // Render the resting hand first so the striking hand passes in front of it.
    for (const hand of [selected === 'left' ? 'right' : 'left', selected]) {
      const active=hand===selected, left=hand==='left', baseX=w*(left?.2:.8), baseY=h*.84;
      const reach=active?flight:0, windup=active?pulled:0;
      const shift=(active && (this.pointer || this.keyAt))?this.aim*24:0;
      this.art?.glove(baseX+(targetX-baseX)*reach+shift*(1-reach),baseY+windup*37+(targetY-baseY-windup*37)*reach,
        Math.min(.82,w/420)* (1+windup*.16-reach*.32),left,(left?.13:-.13)*(1-reach));
    }
    if(punching&&elapsed>120&&elapsed<300&&landed)this.text('✷',targetX,targetY,65,'#e4ff83');
    this.text(this.pointer||this.keyAt?`${this.hand.toUpperCase()} · PULL ${Math.round(this.pull*100)}% · RELEASE`:'GRAB EITHER GLOVE · PULL DOWN · AIM · RELEASE',w/2,25,10);
  }
  ngOnDestroy(): void { this.cancel();if(this.raf)cancelAnimationFrame(this.raf);this.observer?.disconnect(); }
}
