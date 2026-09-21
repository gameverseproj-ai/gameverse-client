import { HallArtComponent } from '../../../shared/components/hall-art/hall-art.component';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { Component, ElementRef, HostListener, OnDestroy, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { slide } from './temple-engine';
import { RouterLink } from '@angular/router';
import { Observable, Subscription, take, timeout } from 'rxjs';
import { TEMPLE_API } from '../../../core/api/temple.api';
import { GameFacade } from '../../../core/facades/game.facade';
import { TempleBootstrap, TempleDirection } from '../../../core/models/temple.model';
@Component({selector:'app-temple',standalone:true,imports: [HallArtComponent, TranslatePipe, RouterLink],templateUrl:'./temple.component.html',styleUrl:'./temple.component.scss'})
export class TempleComponent implements OnDestroy {
  private readonly api=inject(TEMPLE_API);
  private readonly games=inject(GameFacade);
  private readonly board=viewChild<ElementRef<HTMLElement>>('board');
  readonly data=signal<TempleBootstrap|null>(null);
  readonly busy=signal(false);
  readonly error=signal('');
  readonly active=signal(false);
  readonly sound=signal(true);
  readonly merged=signal<number[]>([]);
  readonly spawned=signal<number[]>([]);
  private pendingDirection:TempleDirection|null=null;
  private animations:Animation[]=[];
  private disposed=false;
  private reducedMotion=false;
  private request?:Subscription;
  private operation?:()=>Observable<TempleBootstrap>;
  private queued:TempleDirection|null=null;
  private gesture:{id:number;x:number;y:number}|null=null;
  private audio?:AudioContext;
  constructor(){afterNextRender(()=>{this.reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;this.load();});}
  get run(){return this.data()?.progress.state.run??null;}
  get level(){return this.run?.level??this.data()?.settings.rules.levels.find(l=>l.id===this.data()?.progress.state.currentLevel);}
  get tiles(){return this.run?.board??Array<number>((this.level?.gridSize??4)**2).fill(0);}
  get progress(){return Math.min(100,Math.max(...this.tiles)/(this.level?.targetTile??128)*100);}
  private send(operation:()=>Observable<TempleBootstrap>):void {
    this.operation=operation;this.busy.set(true);this.error.set('');this.request?.unsubscribe();
    this.request=operation().pipe(timeout(10000),take(1)).subscribe({next:async data=>{
      // Presentation failures must never prevent committing an accepted result.
      try { await this.animateMove(data); } catch { this.animations.forEach(a=>a.cancel());this.animations=[]; }
      if(this.disposed)return;
      const wasPlaying=this.run?.status==='playing';
      this.data.set(data);this.games.bootstrap.set(data);this.busy.set(false);
      if(wasPlaying&&this.run?.status==='won')this.celebrate();
      if(this.run?.status!=='playing'){this.active.set(false);this.queued=null;}
      const queued=this.queued;this.queued=null;
      if(queued&&this.active())this.move(queued);
    },error:()=>{this.busy.set(false);this.queued=null;this.error.set('Your last request could not be confirmed. Retry to recover your saved game.');}});
  }
  load():void {this.pendingDirection=null;this.active.set(false);this.send(()=>this.api.getBootstrap());}
  retry():void {if(this.operation&&!this.busy())this.send(this.operation);}
  start():void {
    if(this.busy()||this.error())return;
    try{this.audio??=new AudioContext();void this.audio.resume().catch(()=>{});}catch{/* Optional reward sound. */}
    this.pendingDirection=null;this.merged.set([]);this.spawned.set([]);this.active.set(true);const id=crypto.randomUUID();this.send(()=>this.api.startRun(id));
    this.board()?.nativeElement.focus({preventScroll:true});
  }
  move(direction:TempleDirection):void {
    if(!this.active()||this.error()||this.run?.status!=='playing')return;
    if(this.busy()){this.queued??=direction;return;}
    const request={requestId:crypto.randomUUID(),runId:this.run.id,revision:this.run.revision,direction};
    this.pendingDirection=direction;
    this.send(()=>this.api.move(request));
  }
  @HostListener('window:keydown',['$event']) key(event:KeyboardEvent):void {
    if((event.target as HTMLElement)?.closest('input,textarea,select,a'))return;
    const directions:Record<string,TempleDirection>={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
    if(directions[event.code]&&this.active()){event.preventDefault();if(!event.repeat)this.move(directions[event.code]);}
    if(event.code==='Escape')this.pause();
  }
  @HostListener('window:blur') pause():void {this.active.set(false);this.queued=null;this.gesture=null;}
  @HostListener('document:visibilitychange') visibility():void {if(document.hidden)this.pause();}
  pointerDown(event:PointerEvent):void {
    if(!this.active()||this.gesture||event.button!==0)return;
    event.preventDefault();this.gesture={id:event.pointerId,x:event.clientX,y:event.clientY};
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }
  pointerEnd(event:PointerEvent):void {
    if(this.gesture?.id!==event.pointerId)return;
    const dx=event.clientX-this.gesture.x,dy=event.clientY-this.gesture.y;this.gesture=null;
    if(event.type==='pointerup'&&Math.max(Math.abs(dx),Math.abs(dy))>=18)this.move(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');
    const element=event.currentTarget as HTMLElement;if(element.hasPointerCapture(event.pointerId))element.releasePointerCapture(event.pointerId);
  }
  private async animateMove(data:TempleBootstrap):Promise<void> {
    const before=this.run,after=data.progress.state.run,direction=this.pendingDirection;
    this.merged.set([]);this.spawned.set([]);
    if(!before||!after||before.id!==after.id||after.revision<=before.revision||!direction)return;
    const result=slide(before.board,before.level.gridSize,direction);
    this.pendingDirection=null;
    if(!result.changed)return;
    this.tone([220,300],.035,.09);
    const cells=this.board()?.nativeElement.querySelectorAll<HTMLElement>('.cell');
    if(!this.reducedMotion&&cells){
      this.animations=result.motions.filter(m=>m.from!==m.to).flatMap(m=>{
        const tile=cells[m.from]?.querySelector<HTMLElement>('.tile');
        if(!tile||!cells[m.to])return [];
        const from=cells[m.from].getBoundingClientRect(),to=cells[m.to].getBoundingClientRect();
        return [tile.animate([{transform:'translate(0,0)'},{transform:`translate(${to.left-from.left}px,${to.top-from.top}px)`}],{duration:180,easing:'cubic-bezier(.2,.75,.3,1)',fill:'forwards'})];
      });
      await Promise.all(this.animations.map(a=>a.finished.catch(()=>{})));
      this.animations.forEach(a=>a.cancel());this.animations=[];
    }
    if(this.disposed)return;
    this.merged.set(result.merges);
    this.spawned.set(after.board.map((value,i)=>value&&!result.board[i]?i:-1).filter(i=>i>=0));
    if(result.merges.length)this.tone([523,784,1047],.065,.22);
  }
  private tone(notes:number[],spacing:number,duration:number):void {
    const audio=this.audio;if(!this.sound()||!this.data()?.settings.soundEnabled||!audio||audio.state!=='running')return;
    notes.forEach((note,index)=>{const oscillator=audio.createOscillator(),gain=audio.createGain(),start=audio.currentTime+index*spacing;
      oscillator.frequency.setValueAtTime(note,start);oscillator.frequency.exponentialRampToValueAtTime(note*1.08,start+duration);
      gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.035,start+.008);gain.gain.exponentialRampToValueAtTime(.001,start+duration);
      oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(start);oscillator.stop(start+duration+.01);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};});
  }
  private celebrate():void {
    this.tone([523,659,784,1047],.12,.4);
  }

  ngOnDestroy():void {this.disposed=true;this.animations.forEach(a=>a.cancel());this.request?.unsubscribe();void this.audio?.close().catch(()=>{});}
}
