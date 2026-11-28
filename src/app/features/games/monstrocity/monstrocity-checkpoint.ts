import { Command } from './monstrocity.api';
import { SimulationState } from './monstrocity-local.api';
import { Bootstrap, Snapshot, Sync } from './monstrocity.types';

/** Explicit opt-in. Changing simulation rules requires a new engine version. */
export const CLIENT_ENGINE = 'monstrocity-client-v1';
export interface ClientSimulation {
    engineVersion: typeof CLIENT_ENGINE;
    checkpointIntervalMs: number;
    maxUnsavedMs: number;
}
export interface SimulationSeed {
    engineVersion: typeof CLIENT_ENGINE;
    state: SimulationState;
    randomState: number;
    checkpointSequence: number;
}
export type ClientBootstrap = Bootstrap & { clientSimulation?: ClientSimulation };
export type ClientSnapshot = Snapshot & { simulation?: SimulationSeed };
export type SimulationEvent =
    { kind: 'step'; at: number; body: Sync } |
    { kind: 'command'; at: number; name: Command; body: Record<string, unknown>; key: string };
export interface Checkpoint {
    engineVersion: typeof CLIENT_ENGINE;
    sessionId: string;
    sequence: number;
    baseSequence: number;
    events: SimulationEvent[];
    state: SimulationState;
    randomState: number;
    disconnect: boolean;
}
export interface CheckpointAck { sessionId: string; sequence: number; }
export interface CheckpointTransport {
    checkpoint(id: string, body: Checkpoint, key: string): Promise<CheckpointAck>;
    leaveCheckpoint(id: string, body: Checkpoint, key: string): void;
}
/** Portable uint32 LCG; state is checkpointed, including draws used for encounter IDs. */
export class SimulationRandom {
    constructor(public state: number) {}
    next = () => { this.state = (Math.imul(1664525, this.state) + 1013904223) >>> 0; return this.state / 4294967296; };
    id = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const n = Math.floor(this.next() * 16); return (c === 'x' ? n : (n & 3) | 8).toString(16);
    });
}
