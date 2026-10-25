import { signal } from '@angular/core';
import { MonstrocityAvatarComponent } from './monstrocity-avatar.component';
import { MonstrocityComponent } from './monstrocity.component';
describe('Monstrocity avatar selection',()=>{
 it('switches both swipe directions, without interpreting a swipe as enter',()=>{
  const c:any=Object.create(MonstrocityAvatarComponent.prototype),change=jasmine.createSpy('change'),enter=jasmine.createSpy('enter');
  Object.assign(c,{disabled:()=>false,changeAvatar:{emit:change},enter:{emit:enter},syncPlayback:()=>{}});
  const event=(x:number)=>({isPrimary:true,button:0,pointerId:1,clientX:x,clientY:100,preventDefault:()=>{},currentTarget:{setPointerCapture:()=>{}}}) as unknown as PointerEvent;
  c.down(event(150));c.up(event(50));c.down(event(50));c.up(event(150));
  expect(change).toHaveBeenCalledTimes(2);expect(enter).not.toHaveBeenCalled();
 });
 it('allows a cosmetic change for an existing run and persists the last avatar',()=>{
  const c:any=Object.create(MonstrocityComponent.prototype),state={run:{id:'existing-run',status:'active',survivedDays:12},profile:{character:'female'}};
  const save=jasmine.createSpy('save'),set=jasmine.createSpy('set');
  Object.assign(c,{state:signal(state),busy:()=>false,loading:()=>false,hero:signal('female'),prefs:{setAvatar:save},api:{local:false},scene:{setCharacter:set}});
  c.choose('male');expect(c.hero()).toBe('male');expect(save).toHaveBeenCalledWith('male',false);expect(set).toHaveBeenCalledWith(false);
  expect(c.state().run).toEqual({id:'existing-run',status:'active',survivedDays:12});
  c.choose('female');expect(c.hero()).toBe('female');expect(save).toHaveBeenCalledWith('female',false);
 });
});
