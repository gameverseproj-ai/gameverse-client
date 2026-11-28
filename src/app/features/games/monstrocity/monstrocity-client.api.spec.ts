import { signal } from '@angular/core';
import { MonstrocityComponent } from './monstrocity.component';
import { MonstrocityMotion } from './monstrocity-motion';
import { ClientMonstrocityApi } from './monstrocity-client.api';
import { LocalMonstrocityApi } from './monstrocity-local.api';
import { MonstrocityError } from './monstrocity.api';
import { CLIENT_ENGINE, Checkpoint, ClientBootstrap, ClientSnapshot, SimulationRandom } from './monstrocity-checkpoint';

describe('Monstrocity client simulation transport', () => {
    let time: number;
    let snapshot: ClientSnapshot;
    let bootstrap: ClientBootstrap;
    let remote: any;
    let api: ClientMonstrocityApi;
    beforeEach(async () => {
        time = 0;
        const local = new LocalMonstrocityApi({getItem:()=>null,setItem:()=>{}}, () => 100000, () => 0);
        snapshot = await local.create({character:'male',configVersion:local.config.version},'create');
        snapshot.simulation = {engineVersion:CLIENT_ENGINE,state:local.checkpoint(),randomState:123,checkpointSequence:0};
        bootstrap = {config:local.config,snapshot,clientSimulation:{engineVersion:CLIENT_ENGINE,checkpointIntervalMs:15000,maxUnsavedMs:60000}};
        remote = {
            local:false, bootstrap:jasmine.createSpy().and.callFake(async()=>bootstrap),
            create:jasmine.createSpy().and.callFake(async()=>structuredClone(snapshot)),
            resume:jasmine.createSpy().and.callFake(async()=>structuredClone(snapshot)),
            sync:jasmine.createSpy().and.resolveTo(snapshot), command:jasmine.createSpy().and.resolveTo(snapshot),
            checkpoint:jasmine.createSpy().and.callFake(async (_:string,b:Checkpoint)=>({sessionId:b.sessionId,sequence:b.sequence})),
            leaveCheckpoint:jasmine.createSpy(), leave:jasmine.createSpy(),
        };
        api = new ClientMonstrocityApi(remote,()=>time);
        await api.bootstrap(); await api.create({character:'male',configVersion:local.config.version},'create');
    });
    async function step(frames: any[] = []) {
        time += 50;
        const result = await api.sync(snapshot.run!.id,{sessionId:snapshot.session!.id,frames});
        await Promise.resolve(); await Promise.resolve();
        return result;
    }
    it('runs a minute locally with only four checkpoints and no sync HTTP calls', async () => {
        let latest = snapshot;
        for(let i=0;i<1200;i++) latest=await step();
        expect(remote.sync).not.toHaveBeenCalled();
        expect(remote.checkpoint.calls.count()).toBe(4);
        expect(latest.run!.activeElapsedMs).toBe(60000);
        expect(latest.run!.energy).toBeLessThan(snapshot.run!.energy);
    });
    it('moves immediately while a save is in flight without overlapping requests',async()=>{
        let resolve!: (ack:any)=>void;
        remote.checkpoint.and.callFake(()=>new Promise(r=>resolve=r));
        for(let i=0;i<300;i++) await step();
        const before=await step();
        const after=await step([{sequence:1,moveX:1,moveZ:0}]);
        expect(after.run!.position.x).toBeGreaterThan(before.run!.position.x);
        for(let i=0;i<300;i++) await step();
        expect(remote.checkpoint.calls.count()).toBe(1);
        const sent=remote.checkpoint.calls.first().args[1];
        resolve({sessionId:sent.sessionId,sequence:sent.sequence});
        await Promise.resolve();await Promise.resolve();
    });
    it('retries an immutable batch with the same idempotency key',async()=>{
        remote.checkpoint.and.rejectWith(new Error('offline'));
        for(let i=0;i<401;i++) await step();
        expect(remote.checkpoint.calls.count()).toBe(2);
        expect(remote.checkpoint.calls.argsFor(1)).toEqual(remote.checkpoint.calls.argsFor(0));
        expect(remote.checkpoint.calls.first().args[1].events.length).toBe(300);
    });
    it('bounds unsaved play and rejects progress when the server rejects ownership',async()=>{
        remote.checkpoint.and.rejectWith(new MonstrocityError('SESSION_CONFLICT'));
        for(let i=0;i<300;i++) await step();
        await expectAsync(step()).toBeRejectedWith(jasmine.objectContaining({code:'SESSION_CONFLICT'}));
        expect(remote.checkpoint.calls.count()).toBe(1);
    });
    it('stops after the configured unsaved window rather than accumulating unlimited progress',async()=>{
        remote.checkpoint.and.rejectWith(new Error('offline'));
        for(let i=0;i<1199;i++) await step();
        await expectAsync(step()).toBeRejectedWith(jasmine.objectContaining({code:'SESSION_EXPIRED'}));
        expect(remote.checkpoint.calls.count()).toBeLessThanOrEqual(4);
    });
    it('flushes progress before asking the server to reconcile offline time',async()=>{
        await step();
        await api.resume(snapshot.run!.id,false,'resume');
        expect(remote.checkpoint).toHaveBeenCalledTimes(1);
        expect(remote.resume).toHaveBeenCalledTimes(1);
        expect(remote.checkpoint.calls.first().invocationOrder).toBeLessThan(remote.resume.calls.first().invocationOrder);
    });
    it('keeps purchased items through death but clears collected supplies',async()=>{
        const state=snapshot.simulation!.state;
        snapshot.run!.energy=0.001;
        snapshot.profile.inventory[0].purchased=2;
        snapshot.profile.inventory[0].collected=3;
        state.state=structuredClone({serverTime:snapshot.serverTime,profile:snapshot.profile,run:snapshot.run,session:snapshot.session});
        await api.create({character:'male',configVersion:bootstrap.config.version},'low-energy');
        const dead=await step();
        expect(dead.run!.status).toBe('dead');
        expect(dead.profile.inventory[0].purchased).toBe(2);
        expect(dead.profile.inventory[0].collected).toBe(0);
        expect(remote.checkpoint).toHaveBeenCalledTimes(1);
    });
    it('replaces newer provisional UI state with authoritative resume state',()=>{
        const c:any=Object.create(MonstrocityComponent.prototype);
        const provisional=structuredClone(snapshot);
        provisional.run!.revision+=200;
        const motion=new MonstrocityMotion();
        Object.assign(c,{state:signal(provisional),combatVisualClock:signal(0),motion,frames:[{sequence:12}],
            foundLoot:signal([]),modal:signal(null),clearInput:()=>{}});
        c.apply(snapshot,true);
        expect(c.state().run.revision).toBe(snapshot.run!.revision);
        expect(c.frames).toEqual([]);
        expect(c.sequence).toBe(snapshot.session!.lastAcceptedInputSequence);
    });
    it('does not silently simulate a real account without negotiated support',async()=>{
        delete bootstrap.clientSimulation;
        await api.bootstrap();await api.create({character:'male',configVersion:bootstrap.config.version},'legacy');
        expect(api.clientDriven).toBeFalse();
        await step();expect(remote.sync).toHaveBeenCalledTimes(1);
    });
    it('refuses a negotiated session without server simulation state',async()=>{
        delete snapshot.simulation;
        await expectAsync(api.create({character:'male',configVersion:bootstrap.config.version},'bad')).toBeRejectedWith(jasmine.objectContaining({code:'CONFIG_UNAVAILABLE'}));
    });
    it('saves disconnect with ordered local commands and no old command endpoint',async()=>{
        const state=await step();
        await api.command(state.run!.id,'disconnect',{sessionId:state.session!.id,expectedRevision:state.run!.revision},'bye');
        const batch=remote.checkpoint.calls.first().args[1] as Checkpoint;
        expect(batch.disconnect).toBeTrue();
        expect(batch.events.map(e=>e.kind)).toEqual(['step','command']);
        expect(remote.command).not.toHaveBeenCalled();
    });
    it('closes only once when pagehide is followed by visibilitychange disconnect',async()=>{
        const s=await step();
        api.leave(s.run!.id,{},'pagehide');
        const beacon=remote.leaveCheckpoint.calls.first().args;
        await api.command(s.run!.id,'disconnect',{sessionId:s.session!.id,expectedRevision:s.run!.revision},'hidden');
        expect(remote.checkpoint.calls.count()).toBe(1);
        expect(remote.checkpoint.calls.first().args).toEqual(beacon);
        await api.command(s.run!.id,'disconnect',{},'destroy');
        expect(remote.checkpoint.calls.count()).toBe(1);
    });
    it('recovers in one resume when a stale queued save is rejected after a long interruption',async()=>{
        await step();
        time=80000;
        remote.checkpoint.and.rejectWith(new MonstrocityError('SESSION_EXPIRED'));
        const result=await api.resume(snapshot.run!.id,false,'return');
        expect(remote.resume).toHaveBeenCalledTimes(1);
        expect(result.run!.status).toBe('active');
    });
    it('does not discard pending saves on a transport failure during resume',async()=>{
        await step();
        remote.checkpoint.and.rejectWith(new Error('network unavailable'));
        await expectAsync(api.resume(snapshot.run!.id,false,'return')).toBeRejected();
        expect(remote.resume).not.toHaveBeenCalled();
    });
    it('reproduces the local deadline after a suspended event loop before any save',async()=>{
        time=61000;
        await expectAsync(step()).toBeRejectedWith(jasmine.objectContaining({code:'SESSION_EXPIRED'}));
        expect(remote.checkpoint).not.toHaveBeenCalled();
        await api.resume(snapshot.run!.id,false,'wake');
        await expectAsync(step()).toBeResolved();
    });
    it('replays a saved batch deterministically and never imports preview storage',async()=>{
        for(let i=0;i<300;i++) await step();
        const batch=remote.checkpoint.calls.first().args[1] as Checkpoint;
        let clock=snapshot.simulation!.state.last;
        const rng=new SimulationRandom(snapshot.simulation!.randomState);
        const replay=new LocalMonstrocityApi({getItem:()=>null,setItem:()=>{}},()=>clock,rng.next,rng.id);
        replay.hydrate(bootstrap.config,snapshot.simulation!.state);
        for(const event of batch.events) {
            clock=event.at;
            if(event.kind==='step') await replay.sync(snapshot.run!.id,event.body);
            else await replay.command(snapshot.run!.id,event.name,event.body,event.key);
        }
        expect(replay.checkpoint()).toEqual(batch.state);
        expect(rng.state).toBe(batch.randomState);
    });
});
