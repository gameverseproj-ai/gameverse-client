import { assistedAim } from './monstrocity-aim';
import { signal } from '@angular/core';
import { MonstrocityComponent } from './monstrocity.component';
import { MonstrocityError } from './monstrocity.api';

describe('Monstrocity throw input',()=>{
 let c:any, state:any, target:any;
 beforeEach(()=>{
  state={profile:{inventory:[]},run:{nearby:[],id:'run',revision:1,status:'active',combat:{encounterId:'fight',phase:'approaching',elapsedActiveMs:1000,nextThrowActiveMs:0,hitsRemaining:4}},session:{id:'session'}};
  c=Object.create(MonstrocityComponent.prototype);
  Object.assign(c,{state:signal(state),config:()=>({stoneCooldownSeconds:.9,stoneFlightSeconds:.45}),started:()=>true,modal:()=>null,error:signal(''),busy:signal(false),aiming:signal(null),projectile:signal(null),launchOrigin:signal({x:.72,y:.8}),flight:signal(null),throwQueued:signal(false),retrievingStone:signal(false),foundLoot:signal([]),aimPointer:null,pendingThrow:null,tail:Promise.resolve(),flush:async()=>{},hit:signal(false),disposed:false});
  c.api={command:jasmine.createSpy('command').and.callFake(async()=>structuredClone(state))};
  target={querySelector:()=>null,setPointerCapture:()=>{},getBoundingClientRect:()=>({left:100,top:50,width:200,height:200})};
 });
 afterEach(()=>{clearTimeout(c.shotTimer);clearTimeout(c.hitTimer);clearTimeout(c.retrievalTimer)});
 function event(type:string,x=180,y=120){return {type,pointerId:1,isPrimary:true,button:0,clientX:x,clientY:y,currentTarget:target,preventDefault:()=>{}} as unknown as PointerEvent}
 it('blocks aiming throughout cooldown and requires a fresh gesture after readiness',async()=>{
  state.run.combat.nextThrowActiveMs=1800;c.aimDown(event('pointerdown'));c.aimUp(event('pointerup'));
  expect(c.aiming()).toBeNull();expect(c.throwQueued()).toBeFalse();expect(c.api.command).not.toHaveBeenCalled();
  state.run.combat.elapsedActiveMs=1900;await c.sendThrow();expect(c.api.command).not.toHaveBeenCalled();
  c.aimDown(event('pointerdown'));c.aimUp(event('pointerup'));await c.tail;
  expect(c.api.command).toHaveBeenCalledTimes(1);
 });
 it('blocks aiming during the release animation even when server cooldown has ended',()=>{
  c.projectile.set({x:.4,y:.35});c.aimDown(event('pointerdown'));
  expect(c.aiming()).toBeNull();expect(c.aimPointer).toBeNull();
 });
 it('waits for the visible retrieval to finish even if the server is already ready',()=>{
  c.beginRetrieval();c.aimDown(event('pointerdown'));
  expect(c.reloading).toBeTrue();expect(c.aiming()).toBeNull();
  c.retrievingStone.set(false);c.aimDown(event('pointerdown'));expect(c.aiming()).not.toBeNull();
 });
 it('uses release coordinates even when the last move event was coalesced',async()=>{
  c.aimDown(event('pointerdown'));c.aimUp(event('pointerup',240,190));await c.tail;
  expect(c.api.command.calls.mostRecent().args[2]).toEqual(jasmine.objectContaining({aimX:.7,aimY:.7}));
 });
 it('does not throw on cancellation or lost capture',()=>{
  c.aimDown(event('pointerdown'));c.aimUp(event('pointercancel'));c.aimUp(event('lostpointercapture'));
  expect(c.api.command).not.toHaveBeenCalled();expect(c.throwQueued()).toBeFalse();
 });
 it('does not show a projectile before server acceptance',async()=>{
  let accept!:(s:any)=>void;c.api.command.and.returnValue(new Promise(r=>accept=r));
  c.aimDown(event('pointerdown'));c.aimUp(event('pointerup'));await Promise.resolve();await Promise.resolve();
  expect(c.projectile()).toBeNull();accept(state);await c.tail;expect(c.projectile()).not.toBeNull();
 });
 it('does not send a queued throw into a different encounter after sync',async()=>{
  c.flush=async()=>{state.run.combat.encounterId='other'};
  c.aimDown(event('pointerdown'));c.aimUp(event('pointerup'));await c.tail;
  expect(c.api.command).not.toHaveBeenCalled();expect(c.throwQueued()).toBeFalse();
 });
 it('keeps the hand loaded and ignores duplicate gestures until the server accepts',async()=>{
  let accept!:(s:any)=>void;c.api.command.and.returnValue(new Promise(r=>accept=r));
  c.aimDown(event('pointerdown'));c.aimUp(event('pointerup'));await Promise.resolve();await Promise.resolve();
  expect(c.throwQueued()).toBeTrue();
  c.aimDown(event('pointerdown',240,190));c.aimUp(event('pointerup',240,190));
  expect(c.aiming()).toBeNull();expect(c.api.command).toHaveBeenCalledTimes(1);
  accept(state);await c.tail;expect(c.throwQueued()).toBeFalse();expect(c.projectile()).not.toBeNull();
 });
 it('retains one release across server cooldown rejection and retries when ready',async()=>{
  const snapshot=structuredClone(state);snapshot.run.combat.nextThrowActiveMs=2000;
  c.api.command.and.rejectWith(new MonstrocityError('COOLDOWN',snapshot));
  c.aimDown(event('pointerdown'));c.aimUp(event('pointerup'));await c.tail;await Promise.resolve();
  expect(c.throwQueued()).toBeTrue();expect(c.projectile()).toBeNull();
  c.state().run.combat.elapsedActiveMs=2100;c.api.command.and.resolveTo(c.state());
  await c.sendThrow();expect(c.api.command).toHaveBeenCalledTimes(2);expect(c.projectile()).not.toBeNull();
 });
 it('preserves the release through a slow sync before sending',async()=>{
  let finish!:()=>void;c.flush=()=>new Promise<void>(r=>finish=r);
  c.aimDown(event('pointerdown'));c.aimUp(event('pointerup'));await Promise.resolve();
  expect(c.throwQueued()).toBeTrue();expect(c.api.command).not.toHaveBeenCalled();
  expect(c.pendingThrow.expires).toBeUndefined();finish();await c.tail;
  expect(c.api.command).toHaveBeenCalledTimes(1);expect(c.projectile()).not.toBeNull();
 });

 it('locks a beginner tap to the visible monster and leads it after sync',async()=>{
  const config:any={stoneFlightSeconds:.45,phaseSeconds:{day:240,night:240,dawn:120,dusk:120},monsters:[{id:'twig',motion:'zigzag',motionAmplitude:.22,motionPeriodSeconds:3,approachSeconds:20}]};
  c.config=()=>config;Object.assign(state.run,{activeElapsedMs:2000,configVersion:'monstrocity-v2',survivedDays:0});
  Object.assign(state.run.combat,{monsterId:'twig',target:{x:.3,y:.47}});
  target.querySelector=(selector:string)=>selector==='.monster'?{getBoundingClientRect:()=>({left:140,right:240,top:70,bottom:180})}:null;
  c.flush=async()=>{state.run.combat.elapsedActiveMs=2000};
  c.aimDown(event('pointerdown'));c.aimUp(event('pointerup',280,230));await c.tail;
  const aim=assistedAim(state.run,config),sent=c.api.command.calls.mostRecent().args[2];
  expect(sent.aimX).toBeCloseTo(aim.x,2);expect(sent.aimY).toBeCloseTo(aim.y,2);
  expect(c.projectile().x).toBe(sent.aimX);expect(c.projectile().y).toBe(sent.aimY);
 });
 it('does not assist an off-target tap or an advanced encounter',async()=>{
  state.run.survivedDays=30;
  target.querySelector=(selector:string)=>selector==='.monster'?{getBoundingClientRect:()=>({left:140,right:240,top:70,bottom:180})}:null;
  c.aimDown(event('pointerdown'));c.aimUp(event('pointerup'));await c.tail;
  expect(c.api.command.calls.mostRecent().args[2]).toEqual(jasmine.objectContaining({aimX:.4,aimY:.35}));
 });

});
