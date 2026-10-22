import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild, inject, input } from '@angular/core';
import { MonsterArt, MonsterGaitRenderer } from './monstrocity-gait';

@Component({selector:'app-monstrocity-monster',standalone:true,
 template:`<canvas #canvas width="448" height="448" aria-hidden="true" [class.hit]="hit()"></canvas>`,
 styles:[`:host{display:block;width:100%;aspect-ratio:1}canvas{display:block;width:100%;height:100%}canvas.hit{filter:brightness(1.22)}`]
})
export class MonstrocityMonsterComponent implements AfterViewInit, OnDestroy {
 readonly paused=input(false); readonly artId=input('mossback'); readonly hit=input(false); readonly stopped=input(false);
 @ViewChild('canvas',{static:true}) private canvas!:ElementRef<HTMLCanvasElement>;
 private readonly zone=inject(NgZone);
 private raf=0; private elapsed=0; private previous=0; private source:MonsterArt|null=null;
 private rig?:MonsterGaitRenderer; private destroyed=false;
 ngAfterViewInit(){this.zone.runOutsideAngular(()=>{this.raf=requestAnimationFrame(this.draw);});}
 ngOnDestroy(){this.destroyed=true;cancelAnimationFrame(this.raf);this.rig?.destroy();}
 private draw=(now:number)=>{
  if(this.destroyed)return;
  const id=this.artId()==='twigwalker'?'twigwalker':'mossback';
  if(this.source!==id){this.rig?.destroy();this.source=id;this.rig=new MonsterGaitRenderer(this.canvas.nativeElement,id);this.elapsed=0;}
  const delta=this.previous?Math.min(50,now-this.previous):0;this.previous=now;
  if(!this.paused()&&!this.stopped())this.elapsed+=delta;
  this.rig?.draw(this.elapsed/(id==='twigwalker'?145:180));
  this.raf=requestAnimationFrame(this.draw);
 };
}
