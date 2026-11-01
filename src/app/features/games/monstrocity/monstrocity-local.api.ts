import { residentPose, residentRoute } from './monstrocity-residents';
import { LOCAL_CONFIG } from './monstrocity.config';
import { Command, MonstrocityApi, MonstrocityError } from './monstrocity.api';
import { Bootstrap, CreateRun, Input, ItemId, Point, Snapshot, Sync } from './monstrocity.types';
import { mapFor, distance, movePoint, lineBlocked } from './monstrocity.map';
interface Saved {
    state: Snapshot;
    shelters: number[];
    searched: string[];
    spoken: string[];
    nextEncounter: number;
    last: number;
    offline: number | null;
    offlineEnergyAt: number | null;
    shots: {
        at: number;
        x: number;
        y: number;
    }[];
    combatEnd: number;
    hiddenFor: number;
    receipts: Record<string, {
        body: string;
        snapshot: Snapshot;
    }>;
}
export const LOCAL_SAVE_KEY = 'gameverse.monstrocity.preview.city-v3';
export const freshState = (): Snapshot => ({ serverTime: new Date().toISOString(), profile: { character: 'female', bestSurvivedDays: 0, inventory: ['food', 'water', 'sword'].map(itemId => ({ itemId: itemId as ItemId, collected: 0, purchased: 0 })) }, run: null, session: null });
/** Device-only playable preview. It never modifies the real account, purchases or backend. */
export class LocalMonstrocityApi implements MonstrocityApi {
    readonly local = true;
    readonly config = structuredClone(LOCAL_CONFIG);
    private data: Saved;
    private ownsSession = false;
    constructor(private storage: Pick<Storage, 'getItem' | 'setItem'>, private now = () => Date.now(), private random = () => Math.random()) {
        this.data = { state: freshState(), shelters: [], searched: [], spoken: [], nextEncounter: 18000, last: this.now(), offline: null, offlineEnergyAt: null, shots: [], combatEnd: 0, hiddenFor: 0, receipts: {} };
        const raw = storage.getItem(LOCAL_SAVE_KEY);
        if (raw) {
            try {
                const saved = JSON.parse(raw) as Saved;
                if (saved.state?.profile?.inventory && saved.state.run?.mapVersion === this.config.mapVersion) {
                    this.data = saved;
                    if (this.data.offline === null && this.now() - this.data.last > this.config.transport.disconnectAfterSeconds * 1000)
                        this.data.offline = this.data.last;
                }
            }
            catch { /* corrupt preview doesn't affect account */ }
        }
    }
    private get map() { return mapFor(this.s.run?.mapVersion ?? this.config.mapVersion); }
    private get s() { return this.data.state; }
    private copy() {
        this.s.serverTime = new Date(this.now()).toISOString();
        const snapshot = structuredClone(this.s);
        const r = snapshot.run;
        if (r) {
            r.activeElapsedMs = Math.round(r.activeElapsedMs);
            r.phaseRemainingMs = Math.round(r.phaseRemainingMs);
            r.fogRemainingActiveMs = Math.round(r.fogRemainingActiveMs);
            if (r.recoveryRemainingActiveMs !== null)
                r.recoveryRemainingActiveMs = Math.round(r.recoveryRemainingActiveMs);
            if (r.search)
                r.search.remainingActiveMs = Math.round(r.search.remainingActiveMs);
            if (r.combat) {
                r.combat.elapsedActiveMs = Math.round(r.combat.elapsedActiveMs);
                r.combat.swordWindowRemainingMs = Math.round(r.combat.swordWindowRemainingMs);
                r.combat.nextThrowActiveMs = Math.round(r.combat.nextThrowActiveMs);
            }
        }
        return snapshot;
    }
    private save() { this.storage.setItem(LOCAL_SAVE_KEY, JSON.stringify(this.data)); }
    private fail(code: string): never { throw new MonstrocityError(code, this.copy()); }
    private bump() { if (this.s.run)
        this.s.run.revision++; this.save(); return this.copy(); }
    private verify(id: string, session?: unknown) {
        if (this.s.run?.id !== id)
            this.fail('TARGET_UNAVAILABLE');
        if (this.s.run.status === 'dead')
            this.fail('RUN_DEAD');
        if (session && session !== this.s.session?.id)
            this.fail('SESSION_EXPIRED');
        const saved = this.storage.getItem(LOCAL_SAVE_KEY);
        if (saved) {
            const current = JSON.parse(saved) as Saved;
            if (current.state.session?.id && current.state.session.id !== this.s.session?.id)
                this.fail('SESSION_CONFLICT');
        }
    }
    private receipt(key: string, body: unknown, fn: () => Snapshot): Snapshot {
        const signature = JSON.stringify(body), old = this.data.receipts[key];
        if (old) {
            if (old.body !== signature)
                this.fail('INVALID_REQUEST');
            return structuredClone(old.snapshot);
        }
        const result = fn();
        this.data.receipts[key] = { body: signature, snapshot: result };
        const keys = Object.keys(this.data.receipts);
        if (keys.length > 300)
            delete this.data.receipts[keys[0]];
        this.save();
        return result;
    }
    async bootstrap(): Promise<Bootstrap> { this.reconcile(); return { config: structuredClone(this.config), snapshot: this.copy() }; }
    async create(body: CreateRun, key: string) {
        return this.receipt(key, body, () => {
            if (this.s.run?.status === 'active')
                this.fail('RUN_EXISTS');
            if (body.configVersion !== this.config.version)
                this.fail('CONFIG_UNAVAILABLE');
            this.s.profile.character = body.character;
            for (const item of this.s.profile.inventory)
                item.collected = 0;
            // Shuffle candidate sites, with start near the guaranteed supplies.
            const previous = this.data.shelters[0];
            let start = Math.floor(this.random() * 2);
            if (start === previous)
                start = 1 - start;
            this.data.shelters = [start, 3, 4, ...this.map.shelters.map((_,i)=>i).filter(i=>i>=5)];
            this.data.searched = [];
            this.data.spoken = [];
            this.data.shots = [];
            this.data.offline = null;
            this.data.offlineEnergyAt = null;
            this.data.last = this.now();
            this.data.nextEncounter = 18000;
            this.data.hiddenFor = 0;
            const p = this.map.shelters[start];
            this.s.run = { id: crypto.randomUUID(), revision: 0, configVersion: this.config.version, mapVersion: this.config.mapVersion, status: 'active', activeElapsedMs: 0, survivedDays: 0, phase: 'day', phaseRemainingMs: this.config.phaseSeconds.day * 1000, energy: this.config.energyMax, position: { ...p }, shelterId: 'shelter-' + start, recoveryRemainingActiveMs: null, knownShelters: [{ id: 'shelter-' + start, position: { ...p }, source: 'start' }], nearby: [], notice: null, search: null, dialogue: null, combat: null, fogRemainingActiveMs: 0, deathReason: null };
            this.openSession();
            this.nearby();
            return this.bump();
        });
    }
    private openSession() { this.ownsSession = true; this.s.session = { id: crypto.randomUUID(), status: 'active', pauseReason: null, lastAcceptedInputSequence: 0, lastSeenAt: new Date(this.now()).toISOString(), outsideReturnDeadline: null }; this.data.last = this.now(); }
    async resume(id: string, takeover: boolean, key: string) {
        return this.receipt(key, { id, takeover }, () => {
            const live = this.storage.getItem(LOCAL_SAVE_KEY);
            if (live && !this.ownsSession && !takeover) {
                const saved = JSON.parse(live) as Saved;
                if (saved.state.run?.status === 'active' && saved.offline === null && this.now() - saved.last < this.config.transport.disconnectAfterSeconds * 1000)
                    this.fail('SESSION_CONFLICT');
            }
            this.reconcile();
            if (this.s.run?.id !== id)
                this.fail('TARGET_UNAVAILABLE');
            if (this.s.run.status === 'dead')
                return this.copy();
            const raw = this.storage.getItem(LOCAL_SAVE_KEY);
            if (raw) {
                const saved = JSON.parse(raw) as Saved;
                if (saved.state.session?.id !== this.s.session?.id) {
                    if (!takeover)
                        this.fail('SESSION_CONFLICT');
                    this.data = saved;
                    this.data.offline = this.data.last;
                    this.reconcile();
                }
            }
            if ((this.s as Snapshot).run?.status === 'dead')
                return this.copy();
            this.data.offline = null;
            this.data.offlineEnergyAt = null;
            this.openSession();
            if (this.s.run)
                this.s.run.dialogue = null;
            return this.bump();
        });
    }
    private reconcile() {
        const r = this.s.run;
        if (!r || r.status === 'dead' || this.data.offline === null)
            return;
        const seconds = Math.max(0, (this.now() - this.data.offline) / 1000);
        if (!r.shelterId && seconds >= this.config.outsideDisconnectGraceSeconds) {
            this.die('disconnected');
            this.save();
            return;
        }
        // Local-only imitation of private offline balance, never part of the client HTTP contract.
        const energySeconds = Math.max(0, (this.now() - (this.data.offlineEnergyAt ?? this.data.offline)) / 1000);
        r.energy = Math.max(0, r.energy - energySeconds * .04);
        this.data.offlineEnergyAt = this.now();
        if (r.energy === 0) {
            if (r.shelterId) {
                r.recoveryRemainingActiveMs ??= this.config.recoveryActiveSeconds * 1000;
            }
            else if (r.recoveryRemainingActiveMs === null)
                this.die('energy');
        }
        this.save();
    }
    async sync(id: string, body: Sync) {
        this.verify(id, body.sessionId);
        if (this.data.offline !== null)
            this.fail('SESSION_EXPIRED');
        if (body.frames.length > this.config.transport.maxBatchFrames)
            this.fail('INVALID_REQUEST');
        const fresh = body.frames.filter(f => f.sequence > this.s.session!.lastAcceptedInputSequence);
        let expected = this.s.session!.lastAcceptedInputSequence + 1;
        for (const f of fresh) {
            if (f.sequence !== expected++ || !Number.isFinite(f.moveX) || !Number.isFinite(f.moveZ) || Math.abs(f.moveX) > 1 || Math.abs(f.moveZ) > 1)
                this.fail('INVALID_REQUEST');
        }
        const elapsed = Math.max(0, (this.now() - this.data.last) / 1000);
        if (elapsed > this.config.transport.disconnectAfterSeconds) {
            this.data.offline = this.data.last;
            this.reconcile();
            this.fail(this.s.run?.status === 'dead' ? 'RUN_DEAD' : 'SESSION_EXPIRED');
        }
        if (this.s.session?.status === 'active') {
            const dt = elapsed / Math.max(1, fresh.length);
            if (fresh.length)
                for (const f of fresh)
                    this.step(dt, f);
            else
                this.step(elapsed, { sequence: 0, moveX: 0, moveZ: 0 });
        }
        if (fresh.length)
            this.s.session!.lastAcceptedInputSequence = fresh[fresh.length - 1].sequence;
        this.data.last = this.now();
        this.s.session!.lastSeenAt = new Date(this.now()).toISOString();
        this.nearby();
        return this.bump();
    }
    private step(dt: number, input: Input) {
        // Bound simulation steps so collisions, recovery and projectiles are stable at low frame rates.
        for (let remaining = dt; remaining > 1e-6; remaining -= .05)
            this.tick(Math.min(.05, remaining), input);
    }
    private tick(dt: number, input: Input) {
        const r = this.s.run!;
        if (r.status === 'dead')
            return;
        const c = this.config;
        r.activeElapsedMs += Math.round(dt * 1e6) / 1000;
        r.energy = Math.max(0, r.energy - c.onlineEnergyPerSecond * dt);
        if (r.recoveryRemainingActiveMs !== null) {
            r.recoveryRemainingActiveMs = Math.max(0, r.recoveryRemainingActiveMs - dt * 1000);
            if (r.energy > 0)
                r.recoveryRemainingActiveMs = null;
        }
        if (r.energy === 0 && (r.recoveryRemainingActiveMs === null || r.recoveryRemainingActiveMs <= 0)) {
            this.die('energy');
            return;
        }
        const cycle = Object.values(c.phaseSeconds).reduce((a, b) => a + b, 0) * 1000;
        r.survivedDays = Math.floor(r.activeElapsedMs / cycle);
        let phaseTime = r.activeElapsedMs % cycle;
        const oldPhase = r.phase;
        for (const phase of ['day', 'evening', 'night', 'morning'] as const) {
            const length = c.phaseSeconds[phase] * 1000;
            if (phaseTime < length) {
                r.phase = phase;
                r.phaseRemainingMs = length - phaseTime;
                break;
            }
            phaseTime -= length;
        }
        if (oldPhase !== r.phase && this.random() < c.fog.chancePerPhase)
            r.fogRemainingActiveMs = c.fog.durationSeconds * 1000;
        r.fogRemainingActiveMs = Math.max(0, r.fogRemainingActiveMs - dt * 1000);
        if (r.combat) {
            this.battle(dt);
            return;
        }
        const length = Math.hypot(input.moveX, input.moveZ);
        if (length > .01) {
            r.search = null;
            r.position = movePoint(r.position, input.moveX / Math.max(1, length) * c.moveUnitsPerSecond * dt, input.moveZ / Math.max(1, length) * c.moveUnitsPerSecond * dt, this.map);
        }
        const shelter = this.data.shelters.find(i => distance(r.position, this.map.shelters[i]) < c.shelterRadius);
        r.shelterId = shelter === undefined ? null : 'shelter-' + shelter;
        if (shelter !== undefined && !r.knownShelters.some(s => s.id === r.shelterId))
            r.knownShelters.push({ id: r.shelterId!, position: { ...this.map.shelters[shelter] }, source: 'exploration' });
        if (r.search) {
            r.search.remainingActiveMs -= dt * 1000;
            if (r.search.remainingActiveMs <= 0) {
                const target = r.search.targetId;
                this.data.searched.push(target);
                this.item('food').collected++;
                this.item('water').collected++;
                if (target !== 'crate-start' && this.random() < c.swordLootProbability)
                    this.item('sword').collected++;
                r.search = null;
            }
        }
        if (r.notice) {
            const n = r.notice;
            const hidden = lineBlocked(r.position, n.position,this.map);
            this.data.hiddenFor = hidden ? this.data.hiddenFor + dt : 0;
            if (n.optional && (r.shelterId || distance(r.position, n.position) > c.escapeDistance || this.data.hiddenFor >= c.loseSightSeconds)) {
                r.notice = null;
                this.scheduleEncounter();
            }
            else {
                n.attention = Math.min(1, n.attention + dt / (n.optional ? c.noticeSeconds : c.encounterWarningSeconds));
                if (n.attention >= 1) {
                    r.combat = { encounterId: n.encounterId, monsterId: n.monsterId, phase: 'approaching', elapsedActiveMs: 0, hitsRemaining: this.monster(n.monsterId).hitsToDefeat, target: { x: .5, y: r.configVersion === 'monstrocity-v1' ? .2 : .45 }, swordWindowRemainingMs: 0, nextThrowActiveMs: 0 };
                    r.notice = null;
                    r.search = null;
                }
            }
        }
        else if (!r.shelterId && !r.search && r.activeElapsedMs >= this.data.nextEncounter) {
            const tier = [...c.difficulty].reverse().find(t => r.survivedDays >= t.fromDay)!;
            r.notice = { encounterId: crypto.randomUUID(), monsterId: this.config.monsters[0].id, optional: this.random() < tier.optionalEncounterProbability, attention: 0, position: movePoint(r.position, 0, -3,this.map) };
            this.data.hiddenFor = 0;
        }
    }
    private scheduleEncounter() { const r = this.s.run!, tier = [...this.config.difficulty].reverse().find(t => r.survivedDays >= t.fromDay)!; this.data.nextEncounter = r.activeElapsedMs + 60000 / Math.max(.1, tier.encountersPerActiveMinute); }
    private monster(id: string) { return this.config.monsters.find(m => m.id === id)!; }
    private battle(dt: number) {
        const r = this.s.run!, b = r.combat!, m = this.monster(b.monsterId);
        if (b.phase === 'won') {
            if (r.activeElapsedMs >= this.data.combatEnd) {
                r.combat = null;
                this.scheduleEncounter();
            }
            return;
        }
        b.elapsedActiveMs += Math.round(dt * 1e6) / 1000;
        const seconds = b.elapsedActiveMs / 1000;
        const cycle = Object.values(this.config.phaseSeconds).reduce((a,b)=>a+b,0)*1000;
        const encounterDay = Math.max(0,Math.floor((r.activeElapsedMs-b.elapsedActiveMs)/cycle));
        b.target = { x: .5 + (m.motion === 'zigzag' && encounterDay >= (m.motionStartsDay ?? 0) ? Math.sin(seconds * 2 * Math.PI / m.motionPeriodSeconds) * m.motionAmplitude : 0), y: (r.configVersion === 'monstrocity-v1' ? .2 : .45) + (r.configVersion === 'monstrocity-v1' ? .55 : .2) * Math.min(1, seconds / m.approachSeconds) };
        const ready = this.data.shots.filter(p => p.at <= b.elapsedActiveMs);
        this.data.shots = this.data.shots.filter(p => p.at > b.elapsedActiveMs);
        for (const shot of ready)
            if (Math.hypot(shot.x - b.target.x, shot.y - b.target.y) <= m.hitRadius)
                b.hitsRemaining--;
        if (b.hitsRemaining <= 0) {
            this.win();
            return;
        }
        if (seconds >= m.approachSeconds) {
            b.phase = 'sword-window';
            b.swordWindowRemainingMs = Math.max(0, (m.approachSeconds + m.swordWindowSeconds - seconds) * 1000);
            if (b.swordWindowRemainingMs === 0)
                this.die('monster');
        }
    }
    private win() { this.s.run!.combat!.phase = 'won'; this.data.shots = []; this.data.combatEnd = this.s.run!.activeElapsedMs + this.config.combatResultHoldSeconds * 1000; }
    private die(reason: 'energy' | 'monster' | 'disconnected') { const r = this.s.run!; this.s.profile.bestSurvivedDays = Math.max(this.s.profile.bestSurvivedDays, r.survivedDays); r.status = 'dead'; r.deathReason = reason; r.knownShelters = []; r.search = null; r.notice = null; for (const i of this.s.profile.inventory)
        i.collected = 0; if (r.combat)
        r.combat.phase = 'lost'; }
    private item(id: ItemId) { return this.s.profile.inventory.find(i => i.itemId === id)!; }
    private consume(id: ItemId) { const item = this.item(id); if (item.collected > 0)
        item.collected--;
    else if (item.purchased > 0)
        item.purchased--;
    else
        this.fail('NO_ITEM'); }
    private nearby() { const r = this.s.run; if (!r)
        return; r.nearby = [...this.map.containers.map(p => ({ id: p.id, position: { x: p.x, z: p.z }, kind: 'container' as const, state: this.data.searched.includes(p.id) ? 'searched' as const : 'available' as const })), ...this.map.residents.map(p => ({ id: p.id, position: (({x,z})=>({x,z}))(residentPose(residentRoute(p,this.map),r.activeElapsedMs/1000)), kind: 'resident' as const, state: 'available' as const }))].filter(p => distance(p.position, r.position) < this.config.interactionRadius); }
    async command(id: string, name: Command, body: Record<string, unknown>, key: string) {
        return this.receipt(key, { id, name, body }, () => {
            this.verify(id, body['sessionId']);
            const r = this.s.run!, session = this.s.session!;
            if (body['expectedRevision'] !== r.revision)
                this.fail('REVISION_CONFLICT');
            if (name === 'pause') {
                session.status = 'paused';
                session.pauseReason = body['reason'] as 'map' | 'inventory' | 'dialogue';
            }
            else if (name === 'unpause') {
                session.status = 'active';
                session.pauseReason = null;
                r.dialogue = null;
            }
            else if (name === 'disconnect') {
                this.data.offline = this.now();
                this.data.offlineEnergyAt = null;
                session.status = 'disconnected';
                session.outsideReturnDeadline = r.shelterId ? null : new Date(this.now() + this.config.outsideDisconnectGraceSeconds * 1000).toISOString();
            }
            else if (name === 'consume') {
                const item = body['itemId'];
                if (item !== 'food' && item !== 'water')
                    this.fail('INVALID_REQUEST');
                if (r.energy >= this.config.energyMax)
                    this.fail('INVALID_STATE');
                this.consume(item);
                r.energy = Math.min(this.config.energyMax, r.energy + this.config.restoreEnergy[item]);
                r.recoveryRemainingActiveMs = null;
            }
            else if (name === 'search' || name === 'talk') {
                if (r.combat || session.status !== 'active')
                    this.fail('INVALID_STATE');
                const target = r.nearby.find(p => p.id === body['targetId']);
                if (!target)
                    this.fail('OUT_OF_RANGE');
                if (name === 'search') {
                    if (target.kind !== 'container' || target.state === 'searched')
                        this.fail('TARGET_UNAVAILABLE');
                    r.search = { targetId: target.id, remainingActiveMs: this.config.searchActiveSeconds * 1000 };
                }
                else {
                    if (target.kind !== 'resident')
                        this.fail('TARGET_UNAVAILABLE');
                    let revealed: string | null = null;
                    if (!this.data.spoken.includes(target.id)) {
                        const index = this.data.shelters.find(i => !r.knownShelters.some(s => s.id === 'shelter-' + i));
                        if (index !== undefined) {
                            revealed = 'shelter-' + index;
                            r.knownShelters.push({ id: revealed, position: { ...this.map.shelters[index] }, source: 'resident' });
                        }
                        this.data.spoken.push(target.id);
                    }
                    r.dialogue = { residentId: target.id, textKey: revealed ? 'I marked a safe place on your map.' : 'Keep water in your bag. Night can be long.', revealedShelterId: revealed };
                    session.status = 'paused';
                    session.pauseReason = 'dialogue';
                }
            }
            else if (name === 'throw' || name === 'sword') {
                const b = r.combat;
                if (!b || b.encounterId !== body['encounterId'] || !['approaching', 'sword-window'].includes(b.phase) || session.status !== 'active')
                    this.fail('INVALID_STATE');
                if (name === 'sword') {
                    if (b.phase !== 'sword-window')
                        this.fail('INVALID_STATE');
                    this.consume('sword');
                    this.win();
                }
                else {
                    const x = Number(body['aimX']), y = Number(body['aimY']);
                    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1)
                        this.fail('INVALID_REQUEST');
                    if (b.elapsedActiveMs < b.nextThrowActiveMs)
                        this.fail('COOLDOWN');
                    b.nextThrowActiveMs = b.elapsedActiveMs + this.config.stoneCooldownSeconds * 1000;
                    this.data.shots.push({ at: b.elapsedActiveMs + this.config.stoneFlightSeconds * 1000, x, y });
                }
            }
            this.data.last = this.now();
            this.nearby();
            return this.bump();
        });
    }
}
