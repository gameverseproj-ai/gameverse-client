import { Command, MonstrocityApi, MonstrocityError } from './monstrocity.api';
import { LocalMonstrocityApi } from './monstrocity-local.api';
import { Bootstrap, Config, CreateRun, Snapshot, Sync } from './monstrocity.types';
import { Checkpoint, CheckpointTransport, ClientBootstrap, ClientSimulation, ClientSnapshot, CLIENT_ENGINE, SimulationEvent, SimulationRandom } from './monstrocity-checkpoint';

/** Local simulation, bounded background delivery. Never loads the device-only preview save. */
export class ClientMonstrocityApi implements MonstrocityApi {
    readonly local = false;
    get clientDriven() { return !!this.policy; }
    private policy?: ClientSimulation;
    private config?: Config;
    private engine?: LocalMonstrocityApi;
    private rng = new SimulationRandom(0);
    private clock = 0;
    private wall = 0;
    private events: SimulationEvent[] = [];
    private sequence = 0;
    private pending?: { body: Checkpoint; key: string; count: number };
    private sending?: Promise<void>;
    private due = 0;
    private acknowledgedAt = 0;
    private failures = 0;
    private fatal?: unknown;
    private closing = false;
    private closed = false;
    constructor(private remote: MonstrocityApi & CheckpointTransport, private now = () => performance.now()) {}
    async bootstrap(): Promise<Bootstrap> {
        const result = await this.remote.bootstrap() as ClientBootstrap;
        const p = result.clientSimulation;
        if (p && (p.engineVersion !== CLIENT_ENGINE || !Number.isFinite(p.checkpointIntervalMs) ||
            p.checkpointIntervalMs < 15000 || p.checkpointIntervalMs > 30000 ||
            !Number.isFinite(p.maxUnsavedMs) || p.maxUnsavedMs < p.checkpointIntervalMs * 2 || p.maxUnsavedMs > 120000))
            throw new MonstrocityError('CONFIG_UNAVAILABLE');
        this.policy = p;
        this.config = result.config;
        return result;
    }
    async create(body: CreateRun, key: string) { return this.start(await this.remote.create(body, key)); }
    async resume(id: string, takeover: boolean, key: string) {
        // Finish acknowledged saves before replacing this session. A failed save prevents silent rollback.
        if (this.engine && !this.fatal) {
            try { await this.drain(true); }
            catch (error) {
                // A rejected/expired session must be reconciled by resume, not require a second click.
                if (!(error instanceof MonstrocityError) || !['SESSION_EXPIRED','CHECKPOINT_REJECTED','CHECKPOINT_SEQUENCE','INVALID_STATE','RUN_DEAD'].includes(error.code)) throw error;
            }
        }
        return this.start(await this.remote.resume(id, takeover, key));
    }
    private start(snapshot: Snapshot): Snapshot {
        if (!this.policy || snapshot.run?.status !== 'active') { this.engine = undefined; return snapshot; }
        const seed = (snapshot as ClientSnapshot).simulation;
        if (!seed || seed.engineVersion !== CLIENT_ENGINE || !this.config ||
            seed.state.state.run?.id !== snapshot.run.id || seed.state.state.session?.id !== snapshot.session?.id)
            throw new MonstrocityError('CONFIG_UNAVAILABLE');
        this.clock = seed.state.last;
        this.rng = new SimulationRandom(seed.randomState);
        this.engine = new LocalMonstrocityApi({getItem: () => null, setItem: () => {}}, () => this.clock, this.rng.next, this.rng.id);
        this.engine.hydrate(this.config, {...seed.state, state:snapshotWithoutSeed(snapshot)});
        this.wall = this.now();
        this.acknowledgedAt = this.wall;
        this.due = this.wall + this.policy.checkpointIntervalMs;
        this.sequence = seed.checkpointSequence;
        this.events = []; this.pending = undefined; this.fatal = undefined; this.failures = 0;
        this.closing = false; this.closed = false;
        return snapshot;
    }
    private ready() {
        if (this.fatal) throw this.fatal;
        if (this.closing) throw new MonstrocityError('SESSION_EXPIRED');
        if (this.events.length >= 2500 || this.now() - this.acknowledgedAt >= this.policy!.maxUnsavedMs)
            throw new MonstrocityError('SESSION_EXPIRED');
        // Ignore long render stalls. Offline reconciliation belongs exclusively to resume on the server.
        const wall = this.now();
        this.clock += Math.min(100, Math.max(0, wall - this.wall));
        this.wall = wall;
    }
    async sync(id: string, body: Sync): Promise<Snapshot> {
        if (!this.engine) return this.remote.sync(id, body);
        this.ready();
        const result = await this.engine.sync(id, body);
        this.events.push({kind:'step', at:this.clock, body:structuredClone(body)});
        if (result.run?.status === 'dead') await this.drain(true);
        else this.schedule();
        return result;
    }
    async command(id: string, name: Command, body: Record<string, unknown>, key: string): Promise<Snapshot> {
        if (!this.engine) return this.remote.command(id, name, body, key);
        if (name === 'disconnect' && this.closing) {
            await this.drain(true, true);
            return this.engine.checkpoint().state;
        }
        this.ready();
        const result = await this.engine.command(id, name, body, key);
        this.events.push({kind:'command', at:this.clock, name, body:structuredClone(body), key});
        if (name === 'disconnect') { this.closing = true; await this.drain(true, true); }
        else this.schedule(result.run?.status === 'dead');
        return result;
    }
    private schedule(force = false) {
        if (this.sending || this.now() < this.due && !force) return;
        void this.drain().catch(() => {}); // Error is retained; transient failures retry with the identical batch.
    }
    private batch(disconnect: boolean) {
        if (this.pending) return this.pending;
        const state = this.engine!.checkpoint();
        const body: Checkpoint = {engineVersion:CLIENT_ENGINE, sessionId:state.state.session!.id,
            baseSequence:this.sequence, sequence:this.sequence + 1, events:structuredClone(this.events),
            state, randomState:this.rng.state, disconnect};
        return this.pending = {body, key:crypto.randomUUID(), count:this.events.length};
    }
    private async drain(all = false, disconnect = false): Promise<void> {
        if (!this.engine) return;
        while (this.sending) { await this.sending; if (!all) return; }
        if (this.closed) return;
        if (this.fatal) throw this.fatal;
        if (!this.events.length && !disconnect) return;
        const batch = this.batch(disconnect);
        const id = batch.body.state.state.run!.id;
        this.sending = (async () => {
            try {
                const ack = await this.remote.checkpoint(id, batch.body, batch.key);
                if (ack.sessionId !== batch.body.sessionId || ack.sequence !== batch.body.sequence)
                    throw new MonstrocityError('SESSION_CONFLICT');
                this.sequence = ack.sequence;
                if (batch.body.disconnect) this.closed = true;
                this.events.splice(0, batch.count); this.pending = undefined;
                this.acknowledgedAt = this.now(); this.failures = 0;
                this.due = this.now() + this.policy!.checkpointIntervalMs;
            } catch (error) {
                if (error instanceof MonstrocityError) this.fatal = error;
                this.due = this.now() + Math.min(30000, 5000 * 2 ** Math.min(3, this.failures++));
                throw error;
            } finally { this.sending = undefined; }
        })();
        await this.sending;
        if (all && (this.events.length || disconnect && !batch.body.disconnect)) await this.drain(true, disconnect);
    }
    leave(id: string, body: Record<string, unknown>, key: string) {
        if (!this.engine) { this.remote.leave?.(id, body, key); return; }
        if (this.closed || this.fatal) return;
        this.closing = true;
        // Preserve pending batch identity. A subsequent disconnect carries the newest local position.
        const batch = this.batch(true);
        this.remote.leaveCheckpoint(id, batch.body, batch.key);
        // When an older batch is in flight, normal disconnect drains the remaining events in order.
        if (!batch.body.disconnect) void this.drain(true, true).catch(() => {});
    }
}
function snapshotWithoutSeed(snapshot: Snapshot): Snapshot {
    return {serverTime:snapshot.serverTime, profile:snapshot.profile, run:snapshot.run, session:snapshot.session};
}
