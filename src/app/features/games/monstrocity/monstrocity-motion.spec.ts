import { signal } from '@angular/core';
import { MonstrocityMotion, stickInput, inputTickBudget } from './monstrocity-motion';
import { MonstrocityComponent } from './monstrocity.component';
import { LocalMonstrocityApi } from './monstrocity-local.api';

describe('Monstrocity mobile movement', () => {
    it('filters thumb jitter and caps diagonal speed', () => {
        expect(stickInput(4, 3)).toEqual({ x: 0, y: 0 });
        const diagonal = stickInput(100, 100);
        expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1);
        expect(stickInput(24, 0).x).toBeCloseTo(.5);
    });
    it('replays delayed input once and reconciles acknowledgements without a speed burst', async () => {
        const api = new LocalMonstrocityApi({ getItem: () => null, setItem: () => {} }, Date.now, () => 0);
        const state = await api.create({character:'male',configVersion:api.config.version},crypto.randomUUID());
        state.run!.position = {x:0,z:3};
        const motion = new MonstrocityMotion(); motion.accept(state);
        const step = api.config.moveUnitsPerSecond * api.config.transport.inputTickMs / 1000;
        for(let sequence=1;sequence<=5;sequence++)motion.add({sequence,moveX:1,moveZ:0});
        expect(motion.position(state,api.config)!.x).toBeCloseTo(step*5);
        // Rendering again during a slow request cannot advance the hero a second time.
        expect(motion.position(state,api.config)!.x).toBeCloseTo(step*5);
        const acknowledged = structuredClone(state);
        acknowledged.run!.position.x = step*3;
        acknowledged.session!.lastAcceptedInputSequence = 3;
        motion.accept(acknowledged);
        expect(motion.position(acknowledged,api.config)!.x).toBeCloseTo(step*5);
        acknowledged.run!.position.x=step*5; acknowledged.session!.lastAcceptedInputSequence=5;
        motion.accept(acknowledged);
        expect(motion.position(acknowledged,api.config)!.x).toBeCloseTo(step*5);
        motion.add({sequence:6,moveX:0,moveZ:0});
        expect(motion.position(acknowledged,api.config)!.x).toBeCloseTo(step*5);
        motion.add({sequence:7,moveX:1,moveZ:0});
        const replacement=structuredClone(acknowledged);replacement.session!.id='replacement';
        motion.accept(replacement);
        expect(motion.position(replacement,api.config)).toEqual(replacement.run!.position);
    });
    it('does not stretch a released movement sample across a delayed sync', async () => {
        let now=100000;
        const api=new LocalMonstrocityApi({getItem:()=>null,setItem:()=>{}},()=>now,()=>0);
        const state=await api.create({character:'male',configVersion:api.config.version},crypto.randomUUID());
        const before=state.run!.position;
        now+=1000;
        const next=await api.sync(state.run!.id,{sessionId:state.session!.id,frames:[{sequence:1,moveX:1,moveZ:0}]});
        expect(next.run!.position.x-before.x).toBeCloseTo(api.config.moveUnitsPerSecond*.05);
        expect(next.run!.activeElapsedMs).toBe(1000);
        expect(next.session!.lastAcceptedInputSequence).toBe(1);
    });
    it('uses map collisions when replaying input', async () => {
        const api = new LocalMonstrocityApi({ getItem: () => null, setItem: () => {} }, Date.now, () => 0);
        const state = await api.create({character:'male',configVersion:api.config.version},crypto.randomUUID());
        state.run!.position={x:76.9,z:0};
        const motion=new MonstrocityMotion();motion.accept(state);
        for(let sequence=1;sequence<=10;sequence++)motion.add({sequence,moveX:1,moveZ:0});
        expect(motion.position(state,api.config)!.x).toBeLessThanOrEqual(77);
    });
    it('does not generate a burst of movement after a stalled render frame', () => {
        const interval=.05;
        let tick=inputTickBudget(.04,1,interval), steps=0;
        while(tick>=interval){tick-=interval;steps++;}
        expect(steps).toBe(1);
        expect(tick).toBeCloseTo(.04);
        // High-refresh displays retain fractions instead of reducing walking speed.
        let remainder=0,total=0;
        for(let frame=0;frame<120;frame++){
            remainder=inputTickBudget(remainder,1/120,interval);
            while(remainder>=interval-1e-12){remainder-=interval;total++;}
        }
        expect(total).toBe(20);
    });
    it('releases only the owning pointer and clears movement when focus is lost', () => {
        const c:any=Object.create(MonstrocityComponent.prototype);
        Object.assign(c,{joystick:signal({x:1,y:0}),stickPointer:4,keys:new Set(['w']),scene:{releasePan:()=>{}},retrievingStone:signal(false),throwQueued:signal(false),aiming:signal(null)});
        c.stickUp({pointerId:9});expect(c.joystick().x).toBe(1);
        c.stickUp({pointerId:4});expect(c.joystick()).toEqual({x:0,y:0});
        c.stickPointer=4;c.joystick.set({x:1,y:0});c.clearInput();
        expect(c.stickPointer).toBeNull();expect(c.keys.size).toBe(0);expect(c.joystick()).toEqual({x:0,y:0});
    });
});
