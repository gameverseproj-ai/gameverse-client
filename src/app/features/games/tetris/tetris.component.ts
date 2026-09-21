import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { Component,ElementRef,HostListener,NgZone,OnDestroy,afterNextRender,inject,signal,viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription,take,timeout } from 'rxjs';
import { TETRIS_API } from '../../../core/api/tetris.api';
import { GameFacade } from '../../../core/facades/game.facade';
import { Tetromino,TetrisBootstrap,TetrisReceipt,TetrisResult,TetrisRun } from '../../../core/models/tetris.model';
import { MONETIZATION_POINTS,MonetizationService } from '../../../core/monetization/monetization.service';
import { COLORS,SHAPES,TetrisEngine } from './tetris-engine';
import { TetrisRenderer } from './tetris-renderer';
type Action='left'|'right'|'down'|'rotate'|'counter'|'drop'|'hold';
type Screen='loading'|'ready'|'starting'|'playing'|'paused'|'saving'|'over';
@Component({selector:'app-tetris',standalone:true,imports: [TranslatePipe, RouterLink],templateUrl:'./tetris.component.html',styleUrl:'./tetris.component.scss'})
export class TetrisComponent implements OnDestroy {
 private readonly api=inject(TETRIS_API);private readonly games=inject(GameFacade);private readonly zone=inject(NgZone);private readonly monetization=inject(MonetizationService);
 private readonly canvas=viewChild.required<ElementRef<HTMLCanvasElement>>('board');
 readonly data=signal<TetrisBootstrap|null>(null);readonly screen=signal<Screen>('loading');readonly error=signal('');readonly receipt=signal<TetrisReceipt|null>(null);
 readonly controls=[{action:'left',label:'Move left',icon:'←',short:'LEFT'},{action:'rotate',label:'Rotate clockwise',icon:'↻',short:'ROTATE'},{action:'right',label:'Move right',icon:'→',short:'RIGHT'},{action:'down',label:'Soft drop',icon:'↓',short:'DOWN'},{action:'drop',label:'Hard drop',icon:'⤓',short:'DROP'},{action:'hold',label:'Hold current piece',icon:'⇄',short:'HOLD'}] as const;
 readonly score=signal(0);readonly lines=signal(0);readonly level=signal(1);readonly next=signal<Tetromino[]>([]);readonly held=signal<Tetromino|null>(null);readonly holdReady=signal(true);
 readonly toast=signal('');readonly sound=signal(true);readonly soundBusy=signal(false);readonly soundError=signal('');readonly colors=COLORS;
 private engine?:TetrisEngine;private renderer?:TetrisRenderer;private run?:TetrisRun;private request?:Subscription;private soundRequest?:Subscription;
 private startId:string|null=null;private result:TetrisResult|null=null;private retryAction:'load'|'start'|'finish'='load';private finished=false;
 private raf=0;private time=0;private disposed=false;private flash=0;private toastUntil=0;private audio?:AudioContext;private reducedMotion=false;
 private repeats=new Map<string,{action:Action;next:number}>();
 constructor(){afterNextRender(()=>{
  const canvas=this.canvas().nativeElement,ctx=canvas.getContext('2d');if(!ctx){this.error.set('The game board could not open.');return;}
  const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=300*dpr;canvas.height=600*dpr;ctx.scale(dpr,dpr);this.renderer=new TetrisRenderer(ctx);
  this.reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.load();this.zone.runOutsideAngular(()=>this.raf=requestAnimationFrame(t=>this.frame(t)));
 });}
 load():void {this.error.set('');this.retryAction='load';this.screen.set('loading');this.request?.unsubscribe();
  this.request=this.api.getBootstrap().pipe(timeout(10000),take(1)).subscribe({next:d=>{this.data.set(d);this.games.bootstrap.set(d);this.sound.set(d.settings.soundEnabled);this.engine=new TetrisEngine(d.settings.rules,1);this.sync();this.renderer?.render(this.engine);this.screen.set('ready');},error:()=>this.error.set('Your factory progress could not be loaded. Please retry.')});}
 start():void {
  if(this.soundBusy()||['playing','paused','saving'].includes(this.screen())||(this.screen()==='starting'&&!this.error()))return;
  try{this.audio??=new AudioContext();void this.audio.resume().catch(()=>{});}catch{/* Audio is optional. */}
  this.error.set('');this.retryAction='start';this.screen.set('starting');this.startId??=crypto.randomUUID();this.request?.unsubscribe();this.games.bootstrap.set(null);
  this.request=this.api.startRun(this.startId).pipe(timeout(10000),take(1)).subscribe({next:run=>{this.run=run;this.startId=null;this.result=null;this.finished=false;this.receipt.set(null);this.toast.set('');this.flash=0;this.repeats.clear();this.engine=new TetrisEngine(run.rules,run.seed);this.engine.start();this.sync();this.renderer?.render(this.engine);this.time=performance.now();this.screen.set('playing');this.canvas().nativeElement.focus({preventScroll:true});if(document.hidden)this.pause();},error:()=>this.error.set('The run could not start. Retry the same request.')});
 }
 private frame(time:number):void {
  if(this.disposed)return;const delta=this.time?time-this.time:0;this.time=time;
  if(this.screen()==='playing'&&this.engine){
   const revision=this.engine.revision,locks=this.engine.locks,clears=this.engine.clearSerial,previousLevel=this.engine.level;
   for(const held of this.repeats.values())if(time>=held.next){this.apply(held.action);held.next=time+(held.action==='down'?45:75);}
   this.engine.update(delta);
   if(this.engine.clearSerial!==clears){this.flash=this.reducedMotion?0:1;this.toastUntil=time+1400;this.zone.run(()=>{this.toast.set(this.engine!.level>previousLevel?'LEVEL UP ✦':['','SINGLE ✦','DOUBLE ✦','TRIPLE ✦','TETRIS! ✦'][this.engine!.lastClear.length]);this.tone([523,659,784],.07,.24);});}
   else if(this.engine.locks!==locks)this.tone([190],0,.08);
   if(this.engine.revision!==revision)this.zone.run(()=>this.sync());
   if(this.engine.revision!==revision||this.flash>0)this.renderer?.render(this.engine,this.flash);
   if(this.engine.gameOver)this.zone.run(()=>this.finish());
  }
  if(this.flash>0)this.flash=Math.max(0,this.flash-delta/220);
  if(this.toast()&&time>this.toastUntil)this.zone.run(()=>this.toast.set(''));
  this.raf=requestAnimationFrame(t=>this.frame(t));
 }
 private sync(){const e=this.engine;if(!e)return;this.score.set(e.score);this.lines.set(e.lines);this.level.set(e.level);this.next.set(e.queue.slice(0,3));this.held.set(e.held);this.holdReady.set(e.canHold);}
 private apply(action:Action){const e=this.engine;if(!e||this.screen()!=='playing')return;
  if(action==='left')e.move(-1);else if(action==='right')e.move(1);else if(action==='down')e.softDrop();else if(action==='rotate')e.rotate();else if(action==='counter')e.rotate(true);else if(action==='hold')e.hold();else e.hardDrop();
 }
 action(action:Action):void {
  if(this.screen()!=='playing')return;const e=this.engine!,clears=e.clearSerial,level=e.level;this.apply(action);
  if(e.clearSerial!==clears){this.flash=this.reducedMotion?0:1;this.toastUntil=performance.now()+1400;this.toast.set(e.level>level?'LEVEL UP ✦':['','SINGLE ✦','DOUBLE ✦','TRIPLE ✦','TETRIS! ✦'][e.lastClear.length]);this.tone([523,659,784],.07,.24);}
  else if(action==='drop')this.tone([170],0,.08);
  else if(action==='rotate'||action==='counter')this.tone([390],0,.04);
  this.sync();this.renderer?.render(e,this.flash);if(e.gameOver)this.finish();
 }
 private finish(){if(this.finished||!this.run||!this.engine)return;this.finished=true;this.repeats.clear();const e=this.engine;
  this.result={runId:this.run.id,clears:[...e.clears],softDropCells:e.softDropCells,hardDropCells:e.hardDropCells,elapsedMs:Math.round(e.elapsedMs)};
  // MONETIZATION_POINT: tetris.run_lost — one life ends here, no revive is granted.
  this.monetization.reach({point:MONETIZATION_POINTS.TETRIS_RUN_LOST,gameId:'tetris',runId:this.run.id,segment:this.run.segment,level:e.level});this.saveResult();
 }
 private saveResult(){if(!this.result)return;this.error.set('');this.retryAction='finish';this.screen.set('saving');this.games.bootstrap.set(null);this.request?.unsubscribe();
  this.request=this.api.finishRun(this.result).pipe(timeout(10000),take(1)).subscribe({next:r=>{this.receipt.set(r);this.data.set(r.bootstrap);this.games.bootstrap.set(r.bootstrap);this.screen.set('over');if(r.earned)this.tone([523,659,784,1047],.12,.4);},error:()=>this.error.set('Your result has not been confirmed. Retry to save it without duplicate points.')});
 }
 retry(){if(this.retryAction==='finish')this.saveResult();else if(this.retryAction==='start')this.start();else this.load();}
 pause(){if(this.screen()==='playing'){this.engine?.pause();this.screen.set('paused');}this.repeats.clear();}
 resume(){if(this.screen()==='paused'){this.engine?.start();this.screen.set('playing');this.time=performance.now();this.canvas().nativeElement.focus({preventScroll:true});}}
 @HostListener('window:blur') blur(){this.pause();}
 @HostListener('document:visibilitychange') visibility(){if(document.hidden)this.pause();}
 @HostListener('window:keydown',['$event']) key(event:KeyboardEvent){
  if((event.target as HTMLElement)?.closest('button,a,input,textarea,select'))return;
  if(event.code==='Escape'||event.code==='KeyP'){event.preventDefault();if(!event.repeat)this.screen()==='paused'?this.resume():this.pause();return;}
  const map:Record<string,Action>={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowDown:'down',KeyS:'down',ArrowUp:'rotate',KeyW:'rotate',KeyX:'rotate',KeyZ:'counter',Space:'drop',KeyC:'hold',ShiftLeft:'hold',ShiftRight:'hold'};
  const action=map[event.code];if(!action||this.screen()!=='playing')return;event.preventDefault();if(event.repeat)return;
  this.action(action);if(['left','right','down'].includes(action))this.repeats.set(event.code,{action,next:performance.now()+150});
 }
 @HostListener('window:keyup',['$event']) keyUp(event:KeyboardEvent){this.repeats.delete(event.code);}
 pointerDown(event:PointerEvent,action:Action){if(event.button!==0||this.screen()!=='playing')return;event.preventDefault();this.action(action);if(['left','right','down'].includes(action))this.repeats.set('pointer-'+event.pointerId,{action,next:performance.now()+150});(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);}
 pointerEnd(event:PointerEvent){this.repeats.delete('pointer-'+event.pointerId);const target=event.currentTarget as HTMLElement;if(target.hasPointerCapture(event.pointerId))target.releasePointerCapture(event.pointerId);}
 buttonClick(event:MouseEvent,action:Action){if(event.detail===0)this.action(action);}
 preview(type:Tetromino){return SHAPES[type].filter(row=>row.some(Boolean)).flat();} width(type:Tetromino){return SHAPES[type].length;}
 get progress(){return this.lines()%(this.run?.rules.linesPerLevel??this.data()?.settings.rules.linesPerLevel??10);}
 get target(){return this.run?.rules.linesPerLevel??this.data()?.settings.rules.linesPerLevel??10;}
 toggleSound(){if(this.soundBusy()||!this.data()||this.screen()==='saving')return;const enabled=!this.sound();this.soundBusy.set(true);this.soundError.set('');
  this.soundRequest=this.api.saveSound(enabled).pipe(timeout(10000),take(1)).subscribe({next:d=>{this.sound.set(enabled);this.data.set(d);this.games.bootstrap.set(d);this.soundBusy.set(false);},error:()=>{this.soundBusy.set(false);this.soundError.set('Sound preference could not be saved.');}});}
 private tone(notes:number[],spacing:number,duration:number){const audio=this.audio;if(!this.sound()||audio?.state!=='running')return;
  notes.forEach((note,i)=>{const osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime+i*spacing;osc.frequency.value=note;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.035,t+.008);gain.gain.exponentialRampToValueAtTime(.001,t+duration);osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+duration+.01);osc.onended=()=>{osc.disconnect();gain.disconnect();};});}
 ngOnDestroy(){this.disposed=true;if(this.raf)cancelAnimationFrame(this.raf);this.repeats.clear();this.request?.unsubscribe();this.soundRequest?.unsubscribe();void this.audio?.close().catch(()=>{});}
}
