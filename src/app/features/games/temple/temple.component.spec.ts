import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { TempleComponent } from './temple.component';
import { TempleMockServer } from '../../../core/api/mock/temple-mock-server';
import { TEMPLE_API } from '../../../core/api/temple.api';
import { GameFacade } from '../../../core/facades/game.facade';
import { TempleBootstrap, TempleMove } from '../../../core/models/temple.model';

describe('2048 responsive input', () => {
  let component: TempleComponent;
  let server: TempleMockServer;
  let pending: { request: TempleMove; response: Subject<TempleBootstrap> }[];
  beforeEach(() => {
    pending=[];
    server=new TempleMockServer(undefined,()=>0);
    TestBed.configureTestingModule({ providers: [
      { provide: TEMPLE_API, useValue: { move: (request: TempleMove) => {
        const response=new Subject<TempleBootstrap>(); pending.push({request,response}); return response;
      } } },
      { provide: GameFacade, useValue: { bootstrap: signal(null) } },
    ] });
    TestBed.overrideComponent(TempleComponent, { set: { template: '', imports: [] } });
    component=TestBed.createComponent(TempleComponent).componentInstance;
    component.data.set(server.startRun('test-run-12345'));
    component.active.set(true);
  });
  const accept = (item: {request:TempleMove;response:Subject<TempleBootstrap>}, authority:TempleMockServer) => {
    item.response.next(authority.move(item.request)); item.response.complete(); flushMicrotasks();
  };

  it('shows a predicted slide before the delayed server response without changing saved state', fakeAsync(() => {
    const original=[...component.run!.board];
    component.move('left');
    expect(component.tiles).not.toEqual(original);
    expect(component.run!.board).toEqual(original);
    expect(component.busy()).toBeTrue();
    accept(pending[0],server);
    expect(component.tiles).toEqual(component.run!.board);
    expect(component.previewBoard()).toBeNull();
    expect(component.busy()).toBeFalse();
  }));

  it('preserves three rapid directions in order with confirmed revisions', fakeAsync(() => {
    component.move('left'); component.move('down'); component.move('right');
    expect(pending.length).toBe(1);
    accept(pending[0],server);
    expect(pending[1].request.direction).toBe('down');
    expect(pending[1].request.revision).toBe(1);
    accept(pending[1],server);
    expect(pending[2].request.direction).toBe('right');
    expect(pending[2].request.revision).toBe(2);
    accept(pending[2],server);
    expect(component.run!.revision).toBe(3);
  }));

  it('clears pending directions on pause', fakeAsync(() => {
    component.move('left'); component.move('down'); component.pause();
    accept(pending[0],server);
    expect(pending.length).toBe(1);
    expect(component.active()).toBeFalse();
  }));

  it('rolls back preview after failure and retries the identical request', fakeAsync(() => {
    const original=[...component.run!.board];
    component.move('left');
    pending[0].response.error(new Error('offline'));
    flushMicrotasks();
    expect(component.tiles).toEqual(original);
    expect(component.error()).not.toBe('');
    component.retry();
    expect(pending[1].request).toEqual(pending[0].request);
    accept(pending[1],server);
    expect(component.error()).toBe('');
  }));

  it('recognizes a swipe before release, only once, and ignores tiny movement', () => {
    const move=spyOn(component,'move');
    const surface={setPointerCapture:()=>{},hasPointerCapture:()=>false};
    const event=(type:string,x:number,y:number)=>({type,pointerId:1,button:0,clientX:x,clientY:y,currentTarget:surface,preventDefault:()=>{}} as unknown as PointerEvent);
    component.pointerDown(event('pointerdown',100,100));
    component.pointerMove(event('pointermove',105,101));
    expect(move).not.toHaveBeenCalled();
    component.pointerMove(event('pointermove',80,101));
    expect(move).toHaveBeenCalledOnceWith('left');
    component.pointerEnd(event('pointerup',60,101));
    expect(move).toHaveBeenCalledTimes(1);
  });
});
