import { signal } from '@angular/core';
import { TennisComponent } from './tennis.component';

describe('Tennis court gestures', () => {
  let component: TennisComponent;
  let canvas: HTMLCanvasElement;
  let hit: jasmine.Spy;
  let move: jasmine.Spy;
  function pointer(type: string, time: number, x = 100): PointerEvent {
    const event = new PointerEvent(type, {pointerId:1, pointerType:'touch', button:0, clientX:x, clientY:100});
    Object.defineProperty(event, 'timeStamp', {value:time});
    return event;
  }
  beforeEach(() => {
    canvas = document.createElement('canvas');
    spyOn(canvas, 'getBoundingClientRect').and.returnValue(new DOMRect(0,0,400,800));
    spyOn(canvas, 'setPointerCapture'); spyOn(canvas, 'hasPointerCapture').and.returnValue(false);
    move = jasmine.createSpy('move');
    component = Object.assign(Object.create(TennisComponent.prototype), {
      sport:signal('tennis'),state:signal({phase:'serve'}),page:signal('play'), paused:signal(false), canvas:()=>({nativeElement:canvas}), courtPointer:null,
      match:{move},
    });
    hit = spyOn(component, 'hit');
  });
  it('hits once for a short tap in practice and online', () => {
    for (const page of ['play','online'] as const) {
      component.page.set(page);
      component.touch(pointer('pointerdown',0)); component.endTouch(pointer('pointerup',100));
    }
    expect(hit).toHaveBeenCalledTimes(2);
  });
  it('moves on drag without firing a shot on release', () => {
    component.touch(pointer('pointerdown',0)); component.aim(pointer('pointermove',50,180));
    component.endTouch(pointer('pointerup',100,180));
    expect(move).toHaveBeenCalled(); expect(hit).not.toHaveBeenCalled();
  });
  it('ignores cancelled gestures, holds, and taps outside match pages', () => {
    component.touch(pointer('pointerdown',0)); component.endTouch(pointer('pointercancel',50));
    component.touch(pointer('pointerdown',100)); component.endTouch(pointer('pointerup',600));
    component.page.set('club'); component.touch(pointer('pointerdown',700)); component.endTouch(pointer('pointerup',750));
    expect(hit).not.toHaveBeenCalled();
  });
  it('keeps tennis taps for serving while returns need only movement',()=>{
    const swing=jasmine.createSpy('swing');(component as any).match={move,swing};hit.and.callThrough();
    component.state.set({phase:'rally'} as any);
    component.touch(pointer('pointerdown',0));component.endTouch(pointer('pointerup',100));expect(swing).not.toHaveBeenCalled();
    component.state.set({phase:'serve'} as any);
    component.touch(pointer('pointerdown',200));component.endTouch(pointer('pointerup',300));expect(swing).toHaveBeenCalledTimes(1);
  });

});
