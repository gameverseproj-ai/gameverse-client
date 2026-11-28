import { signal } from '@angular/core';
import { syncDelay, shouldSampleInput } from './monstrocity-sync-policy';
import { MonstrocityComponent } from './monstrocity.component';
import { LocalMonstrocityApi } from './monstrocity-local.api';
const transport = {inputTickMs:50,syncIntervalMs:250,maxBatchFrames:10,disconnectAfterSeconds:5};
describe('Monstrocity low-load sync',()=>{
 it('uses 30 idle heartbeats per minute instead of 240 requests',()=>{
   expect(syncDelay(transport,false,false)).toBe(2000);
   expect(60000/syncDelay(transport,false,false)).toBe(30);
   expect(shouldSampleInput(0,0,0)).toBeFalse();
   expect(shouldSampleInput(0,0,2)).toBeTrue();
   expect(shouldSampleInput(.1,0,0)).toBeTrue();
 });
 it('limits movement batching to server capacity and scales down with larger batches',()=>{
   expect(syncDelay(transport,true,false)).toBe(450);
   expect(syncDelay({...transport,maxBatchFrames:40},true,false)).toBe(1000);
   expect(syncDelay({...transport,disconnectAfterSeconds:1},true,false)).toBe(400);
   expect(syncDelay(transport,false,true)).toBe(500);
 });
 it('does not send an empty pre-command sync, but does send a heartbeat',async()=>{
   const c:any=Object.create(MonstrocityComponent.prototype);
   const api=new LocalMonstrocityApi({getItem:()=>null,setItem:()=>{}},Date.now,()=>0);
   const snapshot=await api.create({character:'male',configVersion:api.config.version},'test');
   const sync=jasmine.createSpy('sync').and.resolveTo(snapshot);
   Object.assign(c,{started:()=>true,frames:[],config:()=>api.config,state:signal(snapshot),api:{sync},apply:jasmine.createSpy('apply')});
   await c.flush();expect(sync).not.toHaveBeenCalled();
   await c.flush(true);expect(sync).toHaveBeenCalledOnceWith(snapshot.run!.id,{sessionId:snapshot.session!.id,frames:[]});
 });
 it('sends only 30 requests through the sync boundary during a minute idle',async()=>{
   const api=new LocalMonstrocityApi({getItem:()=>null,setItem:()=>{}},Date.now,()=>0);
   const snapshot=await api.create({character:'male',configVersion:api.config.version},'loop-test');
   let time=0;spyOn(performance,'now').and.callFake(()=>time);
   spyOn(window,'requestAnimationFrame').and.returnValue(0);
   const sync=jasmine.createSpy('sync').and.resolveTo(snapshot);
   const c:any=Object.create(MonstrocityComponent.prototype);
   Object.assign(c,{disposed:false,last:0,lastSync:0,tick:0,sequence:0,frames:[],tail:Promise.resolve(),syncing:false,
     combatVisualClock:signal(0),projectile:()=>null,pendingThrow:null,music:{setState:()=>{}},
     started:()=>true,state:signal(snapshot),config:()=>({...api.config,transport}),modal:()=>null,error:()=>'',
     busy:()=>false,joystick:()=>({x:0,y:0}),keys:new Set(),motion:{position:()=>snapshot.run!.position},
     zone:{run:(fn:()=>void)=>fn()},api:{sync},apply:()=>{}});
   // Exercise the same scheduling gate and HTTP boundary with a monotonic clock.
   for(time=100;time<=60000;time+=100){
     if(time-c.lastSync>=syncDelay(transport,c.frames.length>0,false))await c.flush(true);
   }
   expect(sync.calls.count()).toBe(30);
   expect(sync.calls.allArgs().every(args=>args[1].frames.length===0)).toBeTrue();
 });
 it('keeps idle sessions alive and settles energy with empty heartbeats',async()=>{
   let now=100000;
   const api=new LocalMonstrocityApi({getItem:()=>null,setItem:()=>{}},()=>now,()=>0);
   const start=await api.create({character:'male',configVersion:api.config.version},'idle-test');
   let state=start;
   for(let n=0;n<30;n++){now+=2000;state=await api.sync(start.run!.id,{sessionId:start.session!.id,frames:[]});}
   expect(state.run!.status).toBe('active');
   expect(state.session!.lastAcceptedInputSequence).toBe(0);
   expect(state.run!.activeElapsedMs).toBe(60000);
   expect(state.run!.energy).toBeLessThan(start.run!.energy);
 });
});
