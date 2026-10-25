import { residentPose,residentRoute } from './monstrocity-residents';
import { LocalMonstrocityApi, LOCAL_SAVE_KEY } from './monstrocity-local.api';
import { Snapshot } from './monstrocity.types';
import { Command } from './monstrocity.api';
import { worldInput } from './monstrocity.input';
import { blocked, movePoint, mapFor, indoorContainerIds } from './monstrocity.map';
describe('Monstrocity local journey', () => {
    let clock: number, api: LocalMonstrocityApi, s: Snapshot;
    let store: Record<string, string>;
    let storage: Pick<Storage, 'getItem' | 'setItem'>;
    const key = () => crypto.randomUUID();
    beforeEach(async () => { clock = 100000; store = {}; storage = { getItem: k => store[k] ?? null, setItem: (k, v) => store[k] = v }; api = new LocalMonstrocityApi(storage, () => clock, () => 0); s = await api.create({ character: 'female', configVersion: api.config.version }, key()); });
    async function cmd(name: Command, body: Record<string, unknown> = {}, id = key()) { s = await api.command(s.run!.id, name, { sessionId: s.session!.id, expectedRevision: s.run!.revision, ...body }, id); return s; }
    async function step(seconds: number, x = 0, z = 0) { clock += seconds * 1000; s = await api.sync(s.run!.id, { sessionId: s.session!.id, frames: [{ sequence: s.session!.lastAcceptedInputSequence + 1, moveX: x, moveZ: z }] }); }
    async function fixture(change: (data: any) => void) { const d = JSON.parse(store[LOCAL_SAVE_KEY]); change(d); store[LOCAL_SAVE_KEY] = JSON.stringify(d); api = new LocalMonstrocityApi(storage, () => clock, () => 0); s = await api.resume(d.state.run.id, true, key()); }
    it('starts in a known shelter and repeats create without a second run', async () => { expect(s.run!.shelterId).toBeTruthy(); expect(s.run!.knownShelters.length).toBe(1); expect(s.run!.energy).toBe(100); await expectAsync(api.create({ character: 'male', configVersion: api.config.version }, key())).toBeRejected(); });
    it('moves by elapsed time and respects walls', async () => { await step(.25, 1, 0); expect(s.run!.position.x).toBeCloseTo(-8.2, 3); const p = { x: -10, z: -7.5 }; expect(blocked({ x: -10, z: -9 })).toBeTrue(); expect(movePoint(p, 0, -1).z).toBe(p.z); });
    it('rejects input sequence gaps without accepting movement', async () => { const before = s.run!.position; await expectAsync(api.sync(s.run!.id, { sessionId: s.session!.id, frames: [{ sequence: 4, moveX: 1, moveZ: 0 }] })).toBeRejected(); expect((await api.bootstrap()).snapshot.run!.position).toEqual(before); });
    it('pauses active time and energy, while continuing heartbeat', async () => { await step(1); await cmd('pause', { reason: 'map' }); const before = s.run!.activeElapsedMs, energy = s.run!.energy; await step(1); await step(1); expect(s.run!.activeElapsedMs).toBe(before); expect(s.run!.energy).toBe(energy); await cmd('unpause'); await step(1); expect(s.run!.activeElapsedMs).toBeCloseTo(before + 1000, 4); });
    it('does not renew the outside return deadline when bootstrap is polled', async () => { await fixture(d => { d.state.run.shelterId = null; d.state.run.position = { x: 4, z: 5 }; }); await cmd('disconnect'); clock += 60000; await api.bootstrap(); clock += 61000; s = (await api.bootstrap()).snapshot; expect(s.run!.status).toBe('dead'); expect(s.run!.deathReason).toBe('disconnected'); });
    it('preserves the recovery remainder across offline returns and menu pause', async () => { await fixture(d => d.state.run.energy = 1); await cmd('disconnect'); clock += 60000; s = await api.resume(s.run!.id, false, key()); expect(s.run!.energy).toBe(0); expect(s.run!.recoveryRemainingActiveMs).toBe(60000); for (let i = 0; i < 20; i++)
        await step(1); expect(s.run!.recoveryRemainingActiveMs).toBeCloseTo(40000, 3); await cmd('pause', { reason: 'inventory' }); await step(1); expect(s.run!.recoveryRemainingActiveMs).toBeCloseTo(40000, 3); await cmd('disconnect'); clock += 120000; s = await api.resume(s.run!.id, false, key()); expect(s.run!.recoveryRemainingActiveMs).toBeCloseTo(40000, 3); });
    it('consumes found food first and deduplicates a repeated use', async () => { await fixture(d => { d.state.run.energy = 10; d.state.profile.inventory[0] = { itemId: 'food', collected: 1, purchased: 2 }; }); const body = { sessionId: s.session!.id, expectedRevision: s.run!.revision, itemId: 'food' }; const id = key(); s = await api.command(s.run!.id, 'consume', body, id); expect(s.profile.inventory[0].collected).toBe(0); expect(s.profile.inventory[0].purchased).toBe(2); const again = await api.command(s.run!.id, 'consume', body, id); expect(again.run!.energy).toBe(s.run!.energy); });
    it('death clears found items and shelter knowledge but keeps purchases and best days', async () => { await fixture(d => { d.state.run.energy = .001; d.state.run.survivedDays = 4; d.state.profile.inventory[2] = { itemId: 'sword', collected: 2, purchased: 1 }; }); await step(1); expect(s.run!.status).toBe('dead'); expect(s.profile.inventory[2]).toEqual({ itemId: 'sword', collected: 0, purchased: 1 }); expect(s.run!.knownShelters).toEqual([]); expect(s.profile.bestSurvivedDays).toBe(4); });
    it('finds supplies only once and movement cancels an unfinished search', async () => { await fixture(d => d.state.run.position = { x: -7, z: -5.8 }); await step(.1); await cmd('search', { targetId: 'crate-start' }); await step(.25, 1, 0); expect(s.run!.search).toBeNull(); await cmd('search', { targetId: 'crate-start' }); await step(1); await step(1); await step(.1); expect(s.profile.inventory[0].collected).toBe(1); await expectAsync(cmd('search', { targetId: 'crate-start' })).toBeRejected(); });
    it('resident reveals one shelter and pauses the journey', async () => { await fixture(d => d.state.run.position = (({x,z})=>({x,z}))(residentPose(residentRoute(mapFor(api.config.mapVersion).residents.find(p=>p.id==='keeper')!,mapFor(api.config.mapVersion)),.1))); await step(.1); await cmd('talk', { targetId: 'keeper' }); expect(s.run!.knownShelters.length).toBe(2); expect(s.session!.status).toBe('paused'); await cmd('unpause'); await cmd('talk', { targetId: 'keeper' }); expect(s.run!.knownShelters.length).toBe(2); });
    it('sword wins only in its window and costs exactly one', async () => { await fixture(d => { d.state.profile.inventory[2].collected = 1; d.state.run.combat = { encounterId: 'battle', monsterId: 'mossback', phase: 'approaching', elapsedActiveMs: 1000, hitsRemaining: 4, target: { x: .5, y: .45 }, swordWindowRemainingMs: 0, nextThrowActiveMs: 0 }; }); await expectAsync(cmd('sword', { encounterId: 'battle' })).toBeRejected(); await fixture(d => { d.state.run.combat.phase = 'sword-window'; d.state.run.combat.elapsedActiveMs = 24500; }); await cmd('sword', { encounterId: 'battle' }); expect(s.run!.combat!.phase).toBe('won'); expect(s.profile.inventory[2].collected).toBe(0); });
    it('a launched stone resolves after flight and cooldown rejects rapid repeats', async () => { await fixture(d => { d.state.run.combat = { encounterId: 'battle', monsterId: 'mossback', phase: 'approaching', elapsedActiveMs: 0, hitsRemaining: 4, target: { x: .5, y: .45 }, swordWindowRemainingMs: 0, nextThrowActiveMs: 0 }; }); await cmd('throw', { encounterId: 'battle', aimX: .5, aimY: .46 }); expect(s.run!.combat!.hitsRemaining).toBe(4); await expectAsync(cmd('throw', { encounterId: 'battle', aimX: .5, aimY: .46 })).toBeRejected(); await step(.5); expect(s.run!.combat!.hitsRemaining).toBe(3); });
    it('requires explicit takeover in a second tab and revokes the old session', async () => { const other = new LocalMonstrocityApi(storage, () => clock, () => 0); await other.bootstrap(); await expectAsync(other.resume(s.run!.id, false, key())).toBeRejected(); await other.resume(s.run!.id, true, key()); await expectAsync(api.sync(s.run!.id, { sessionId: s.session!.id, frames: [] })).toBeRejected(); });
    it('counts a complete 6-minute active day without counting menu time', async () => { api.config.onlineEnergyPerSecond = 0; for (let i = 0; i < 90; i++)
        await step(4); expect(s.run!.survivedDays).toBe(1); expect(s.run!.phase).toBe('day'); await cmd('pause', { reason: 'map' }); const elapsed = s.run!.activeElapsedMs; for (let i = 0; i < 5; i++)
        await step(4); expect(s.run!.activeElapsedMs).toBe(elapsed); });
    it('accepts joystick input at every angle, including near world-axis alignment', async () => {
        for (let angle = 0; angle < Math.PI * 2; angle += .01) {
            const input = worldInput(Math.cos(angle), Math.sin(angle));
            expect(Math.abs(input.moveX)).toBeLessThanOrEqual(1);
            expect(Math.abs(input.moveZ)).toBeLessThanOrEqual(1);
            expect(Math.hypot(input.moveX, input.moveZ)).toBeCloseTo(1, 12);
        }
        const aligned = worldInput(.785, .62);
        clock += 100;
        s = await api.sync(s.run!.id, {sessionId: s.session!.id, frames: [{sequence: 1, ...aligned}]});
        expect(s.session!.lastAcceptedInputSequence).toBe(1);
    });
    it('preserves the original aiming trajectory for an already saved v1 journey', async () => {
        await fixture(d => {
            d.state.run.configVersion = 'monstrocity-v1';
            d.state.run.combat = { encounterId: 'legacy', monsterId: 'mossback', phase: 'approaching', elapsedActiveMs: 0, hitsRemaining: 4, target: {x: .5, y: .2}, swordWindowRemainingMs: 0, nextThrowActiveMs: 0 };
        });
        await step(.5);
        expect(s.run!.combat!.target.y).toBeCloseTo(.2 + .55 * .5 / api.config.monsters.find(m => m.id === 'mossback')!.approachSeconds, 6);
    });
    it('keeps early battles straight and enables evasion only for battles starting on day 30',async()=>{
        const cycle=Object.values(api.config.phaseSeconds).reduce((a,b)=>a+b,0)*1000;
        for(const start of [0,29*cycle,30*cycle-100,30*cycle,40*cycle]){
            await fixture(d=>{
                d.state.run.activeElapsedMs=start;d.state.run.energy=100;
                d.state.run.combat={encounterId:'day-gate',monsterId:'twigwalker',phase:'approaching',elapsedActiveMs:0,hitsRemaining:3,target:{x:.5,y:.45},swordWindowRemainingMs:0,nextThrowActiveMs:0};
            });
            await step(.5);
            if(start<30*cycle)expect(s.run!.combat!.target.x).toBe(.5);
            else expect(s.run!.combat!.target.x).toBeGreaterThan(.5);
        }
    });

    it('always grants supplies when an enterable house is searched and never grants them twice',async()=>{
        const map=mapFor(api.config.mapVersion),ids=indoorContainerIds(map);
        for(const id of ids){
            const target=map.containers.find(c=>c.id===id)!;
            await fixture(d=>{d.state.run.position={x:target.x-1,z:target.z};d.state.run.combat=null;d.state.run.notice=null;d.nextEncounter=1e12;d.state.run.energy=100;});
            await step(.05);
            const before=s.profile.inventory.reduce((n,i)=>n+i.collected,0);
            await cmd('search',{targetId:id});await step(api.config.searchActiveSeconds+.1);
            const after=s.profile.inventory.reduce((n,i)=>n+i.collected,0);
            expect(after).withContext(id).toBeGreaterThan(before);
            await expectAsync(cmd('search',{targetId:id})).toBeRejected();
            expect(s.profile.inventory.reduce((n,i)=>n+i.collected,0)).toBe(after);
        }
    });

    it('uses the configured 2/1/2/1 minute phases and correct countdown at each boundary',async()=>{
        api.config.onlineEnergyPerSecond=0;
        expect(s.run!.phaseRemainingMs).toBe(120000);
        for(const [elapsed,phase,remaining,days] of [[119999,'day',1,0],[120000,'evening',60000,0],[180000,'night',120000,0],[300000,'morning',60000,0],[360000,'day',120000,1]] as const){
            await fixture(d=>{d.state.run.activeElapsedMs=elapsed-1;d.nextEncounter=1e12;});
            await step(.001);
            expect(s.run!.phase).toBe(phase);expect(s.run!.phaseRemainingMs).toBe(remaining);expect(s.run!.survivedDays).toBe(days);
        }
    });

});
