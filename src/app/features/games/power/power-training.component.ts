import { Component, ElementRef, Input, NgZone, inject, OnChanges, OnDestroy, SimpleChanges, afterNextRender, signal, viewChild } from '@angular/core';
import { TrainingRenderer } from './training-renderer';
import { exerciseSeconds } from './training-rig';
@Component({selector:'app-power-training',standalone:true,template:`
 <div class="stage"><canvas #canvas aria-label="Three-dimensional exercise demonstration"></canvas></div>
 @if (failed()) { <p role="alert">The exercise preview needs WebGL. Please enable hardware acceleration.</p> }
 `,styles:[`:host{display:block}.stage{position:relative;border-radius:16px;overflow:hidden;background:#e5e8df}canvas{display:block;width:100%;height:420px}@media(max-width:600px){canvas{height:330px}}`]})
export class PowerTrainingComponent implements OnChanges,OnDestroy{
 @Input() exercise=0;@Input() pulse=0;@Input() repetition=0;
 readonly failed=signal(false);
 private readonly zone=inject(NgZone);private lastFrame="";
 private readonly canvas=viewChild<ElementRef<HTMLCanvasElement>>('canvas');private art?:TrainingRenderer;private observer?:ResizeObserver;private raf=0;private started=-100000;
 constructor() {
  afterNextRender(() => {
   try {
    const canvas = this.canvas()!.nativeElement;
    this.art = new TrainingRenderer(canvas);
    this.observer = new ResizeObserver(() => {
     this.art?.resize(canvas.clientWidth, canvas.clientHeight);
     this.lastFrame = '';
    });
    this.observer.observe(canvas);
    const frame = (now: number) => {
     const phase = Math.min(1, Math.max(0, (now - this.started) / (exerciseSeconds(this.exercise) * 1000)));
     const key = `${this.exercise}:${this.repetition}:${phase}`;
     if (key !== this.lastFrame) {
      this.art?.draw(this.exercise, phase, 'three-quarter', this.repetition);
      this.lastFrame = key;
     }
     this.raf = requestAnimationFrame(frame);
    };
    this.zone.runOutsideAngular(() => this.raf = requestAnimationFrame(frame));
   } catch {
    this.failed.set(true);
   }
  });
 }
 ngOnChanges(changes:SimpleChanges){if(changes['exercise'])this.started=-100000;if(changes['pulse']&&this.pulse>0)this.started=performance.now();}
 ngOnDestroy(){cancelAnimationFrame(this.raf);this.observer?.disconnect();this.art?.dispose();}
}
