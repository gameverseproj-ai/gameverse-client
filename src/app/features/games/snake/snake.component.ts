import { Component, ElementRef, HostListener, NgZone, OnDestroy, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription, take, timeout } from 'rxjs';
import { SNAKE_API } from '../../../core/api/snake.api';
import { GameFacade } from '../../../core/facades/game.facade';
import { SnakeBootstrap, SnakeFinishRequest, SnakeReceipt, SnakeRun } from '../../../core/models/snake.model';
import { MONETIZATION_POINTS, MonetizationService } from '../../../core/monetization/monetization.service';
import { Direction, SnakeEngine } from '../engines/snake/snake-engine';
import { SnakeRenderer } from '../engines/snake/snake-renderer';

type Screen = 'loading' | 'ready' | 'starting' | 'playing' | 'paused' | 'saving' | 'lost' | 'won';
@Component({selector:'app-jelly-snake',standalone:true,imports:[RouterLink],templateUrl:'./snake.component.html',styleUrl:'./snake.component.scss'})
export class SnakeComponent implements OnDestroy {
  private readonly api=inject(SNAKE_API);
  private readonly games=inject(GameFacade);
  private readonly monetization=inject(MonetizationService);
  private readonly zone=inject(NgZone);
  private readonly canvas=viewChild.required<ElementRef<HTMLCanvasElement>>('board');
  readonly data=signal<SnakeBootstrap|null>(null);
  readonly screen=signal<Screen>('loading');
  readonly error=signal('');
  readonly score=signal(0);
  readonly collected=signal(0);
  readonly rewards=signal<{id:number;points:number;x:number;y:number}[]>([]);
  readonly displayedReward=signal(0);
  private rewardStarted=0;
  private rewardSequence=0;
  private reducedMotion=false;
  readonly receipt=signal<SnakeReceipt|null>(null);
  readonly settingsBusy=signal(false);
  readonly sound=signal(true);
  private readonly engine=new SnakeEngine();
  private readonly renderer=new SnakeRenderer();
  private request?:Subscription;
  private preferencesRequest?:Subscription;
  private run:SnakeRun|null=null;
  private pendingResult:SnakeFinishRequest|null=null;
  private startId:string|null=null;
  private retryAction: 'load'|'start'|'finish' = 'load';
  private raf=0;
  private lastTime=0;
  private disposed=false;
  private ended=false;
  private gesture:{id:number;x:number;y:number}|null=null;
  private audio?:AudioContext;

  constructor(){afterNextRender(()=>{
    this.reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas=this.canvas().nativeElement,ctx=canvas.getContext('2d');
    if(!ctx){this.error.set('Your browser could not open the game board.');return;}
    const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=640*dpr;canvas.height=640*dpr;ctx.scale(dpr,dpr);
    this.renderer.init({canvas,ctx,width:640,height:640});
    const cached=this.games.bootstrap();
    if(cached?.gameId==='snake' && Array.isArray(cached.settings.rules['levels']) && typeof (cached.settings.rules['levels'][0] as unknown as {winLength?:number})?.winLength === 'number' && typeof cached.progress.state['snakePoints']==='number')this.acceptBootstrap(cached as SnakeBootstrap);
    else this.load();
    this.zone.runOutsideAngular(()=>{this.raf=requestAnimationFrame(t=>this.frame(t));});
  });}
  private acceptBootstrap(data:SnakeBootstrap):void {
    this.data.set(data);this.games.bootstrap.set(data);this.sound.set(data.settings.soundEnabled);
    this.engine.init({level:data.settings.rules.levels[0],items:data.settings.rules.items});
    this.score.set(0);this.collected.set(0);this.renderer.render(this.engine.state);this.screen.set('ready');
  }
  load():void {
    this.error.set('');this.retryAction='load';this.screen.set('loading');this.request?.unsubscribe();
    this.request=this.api.getBootstrap().pipe(timeout(10000),take(1)).subscribe({next:d=>this.acceptBootstrap(d),error:()=>this.error.set('Progress could not be loaded. Please try again.')});
  }
  start():void {
    if(this.settingsBusy() || ['playing','paused','saving'].includes(this.screen()))return;
    if(this.screen()==='starting'&&!this.error())return;
    this.prepareAudio();this.error.set('');this.retryAction='start';this.screen.set('starting');
    this.games.bootstrap.set(null);
    this.startId??=crypto.randomUUID();this.request?.unsubscribe();
    this.request=this.api.startRun(this.startId).pipe(timeout(10000),take(1)).subscribe({
      next:run=>{
        this.rewards.set([]);this.rewardStarted=0;this.displayedReward.set(0);
        this.run=run;this.startId=null;this.pendingResult=null;this.ended=false;this.receipt.set(null);
        this.engine.init({level:run.level,items:run.items});this.engine.start();
        this.score.set(0);this.collected.set(0);this.lastTime=performance.now();
        this.screen.set('playing');this.renderer.render(this.engine.state);this.canvas().nativeElement.focus({preventScroll:true});
        if(document.hidden)this.pause();
      },error:()=>this.error.set('The run could not start. Try again; you will not be charged anything.'),
    });
  }
  private frame(time:number):void {
    if(this.disposed)return;
    const delta=this.lastTime?time-this.lastTime:0;this.lastTime=time;
    if(this.screen()==='playing'){
      const tick=this.engine.state.tick,foods=this.engine.state.collected.length;
      const food={...this.engine.state.food};
      const state=this.engine.update(delta);
      if(state.tick!==tick || state.dead || state.won)this.renderer.render(state);
      if(state.collected.length!==foods)this.zone.run(()=>{this.score.set(state.score);this.collected.set(state.collected.length);
        this.rewards.set([{id:++this.rewardSequence,points:food.item.points,x:(food.x+.5)/state.gridSize*100,y:(food.y+.5)/state.gridSize*100}]);this.chime();});
      if(state.dead||state.won)this.zone.run(()=>this.endRun());
    }
    if(this.rewardStarted && this.receipt()){
      const progress=Math.min(1,(time-this.rewardStarted)/900);
      const value=Math.round(this.receipt()!.earned*(1-Math.pow(1-progress,3)));
      if(value!==this.displayedReward())this.zone.run(()=>this.displayedReward.set(value));
      if(progress===1)this.rewardStarted=0;
    }
    this.raf=requestAnimationFrame(t=>this.frame(t));
  }
  private endRun():void {
    if(this.ended||!this.run)return;this.ended=true;
    const state=this.engine.state;
    this.pendingResult={runId:this.run.id,outcome:state.won?'won':'lost',collected:[...state.collected],elapsedMs:Math.round(state.elapsedMs)};
    if(state.dead){
      // MONETIZATION_POINT: snake.run_lost. One life ends here; no revive is granted.
      this.monetization.reach({point:MONETIZATION_POINTS.SNAKE_RUN_LOST,gameId:'snake',runId:this.run.id,segment:this.run.segment,level:this.run.level.id});
    }
    this.saveResult();
  }
  private saveResult():void {
    if(!this.pendingResult)return;
    this.screen.set('saving');this.error.set('');this.retryAction='finish';this.request?.unsubscribe();
    this.games.bootstrap.set(null);
    this.request=this.api.finishRun(this.pendingResult).pipe(timeout(10000),take(1)).subscribe({
      next:r=>{this.receipt.set(r);this.data.set(r.bootstrap);this.games.bootstrap.set(r.bootstrap);this.screen.set(r.outcome);this.displayedReward.set(this.reducedMotion?r.earned:0);this.rewardStarted=this.reducedMotion?0:performance.now();if(r.earned>0)this.chime(true);},
      error:()=>this.error.set('Your result has not been confirmed. Retry to save it safely.'),
    });
  }
  retry():void {if(this.retryAction==='finish')this.saveResult();else if(this.retryAction==='start')this.start();else this.load();}
  pause():void {if(this.screen()==='playing'){this.engine.pause();this.screen.set('paused');this.gesture=null;}}
  resume():void {if(this.screen()==='paused'){this.engine.start();this.lastTime=performance.now();this.screen.set('playing');this.canvas().nativeElement.focus({preventScroll:true});}}
  steer(direction:Direction):void {if(this.screen()==='playing')this.engine.setDirection(direction);}
  @HostListener('window:keydown',['$event'])
  onKey(event:KeyboardEvent):void {
    if((event.target as HTMLElement)?.closest('input,select,textarea'))return;
    const keys:Record<string,Direction>={ArrowUp:'UP',KeyW:'UP',ArrowDown:'DOWN',KeyS:'DOWN',ArrowLeft:'LEFT',KeyA:'LEFT',ArrowRight:'RIGHT',KeyD:'RIGHT'};
    if(keys[event.code]&&this.screen()==='playing'){event.preventDefault();this.steer(keys[event.code]);}
    if((event.code==='Space'||event.code==='Escape')&&!event.repeat&&!((event.target as HTMLElement)?.closest('button,a'))){
      if(this.screen()==='playing'){event.preventDefault();this.pause();}else if(this.screen()==='paused'){event.preventDefault();this.resume();}
    }
  }
  @HostListener('window:blur') onBlur():void {this.pause();}
  @HostListener('document:visibilitychange') onVisibility():void {if(document.hidden)this.pause();}
  pointerDown(event:PointerEvent):void {
    if(this.screen()!=='playing'||this.gesture||event.button!==0)return;
    event.preventDefault();this.gesture={id:event.pointerId,x:event.clientX,y:event.clientY};
    this.canvas().nativeElement.setPointerCapture(event.pointerId);
  }
  pointerMove(event:PointerEvent):void {
    if(!this.gesture||this.gesture.id!==event.pointerId)return;
    const dx=event.clientX-this.gesture.x,dy=event.clientY-this.gesture.y;
    if(Math.max(Math.abs(dx),Math.abs(dy))<12)return;
    this.steer(Math.abs(dx)>Math.abs(dy)?(dx>0?'RIGHT':'LEFT'):(dy>0?'DOWN':'UP'));
    this.gesture.x=event.clientX;this.gesture.y=event.clientY;
  }
  pointerEnd(event:PointerEvent):void {if(this.gesture?.id===event.pointerId){this.gesture=null;if(this.canvas().nativeElement.hasPointerCapture(event.pointerId))this.canvas().nativeElement.releasePointerCapture(event.pointerId);}}
  toggleSound():void {
    const data=this.data();if(!data||this.settingsBusy())return;
    const next=!this.sound();this.settingsBusy.set(true);
    this.preferencesRequest=this.api.savePreferences({soundEnabled:next,musicEnabled:data.settings.musicEnabled}).pipe(timeout(10000),take(1)).subscribe({
      next:d=>{this.sound.set(next);this.data.set(d);this.games.bootstrap.set(d);this.settingsBusy.set(false);},
      error:()=>{this.settingsBusy.set(false);this.settingsMessage.set('Sound preference could not be saved.');},
    });
    this.settingsMessage.set('');
  }
  readonly settingsMessage=signal('');
  private prepareAudio():void {try{this.audio??=new AudioContext();void this.audio.resume().catch(()=>{});}catch{/* Audio is optional. */}}
  private chime(celebration=false):void {
    if(!this.sound()||!this.audio||this.audio.state!=='running')return;
    const audio=this.audio,now=audio.currentTime;
    const notes=celebration?[523.25,659.25,783.99,1046.5]:[783.99,1046.5];
    notes.forEach((frequency,index)=>{
      const oscillator=audio.createOscillator(),gain=audio.createGain();
      const start=now+index*(celebration?.12:.065),duration=celebration?.45:.23;
      oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,start);
      gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.055,start+.012);
      gain.gain.exponentialRampToValueAtTime(.001,start+duration);
      oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(start);oscillator.stop(start+duration+.01);
      oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
    });
  }
  get target():number {const level=this.run?.level??this.data()?.settings.rules.levels[0];return level?.winLength??64;}
  get snakeLength():number {return (this.run?.level.initialLength??this.data()?.settings.rules.levels[0].initialLength??3)+this.collected();}
  get levelNumber():number {return this.run&&['playing','paused','saving'].includes(this.screen())?this.run.level.id:this.data()?.progress.state.currentLevel??1;}
  ngOnDestroy():void {this.disposed=true;if(this.raf)cancelAnimationFrame(this.raf);this.request?.unsubscribe();this.preferencesRequest?.unsubscribe();if(this.engine.state)this.engine.destroy();this.renderer.destroy();void this.audio?.close().catch(()=>{});}
}
