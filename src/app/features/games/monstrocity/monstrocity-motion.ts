import { mapFor, movePoint } from './monstrocity.map';
import { Config, Input, Point, Snapshot } from './monstrocity.types';

/** Replay only unacknowledged input for rendering; snapshots remain authoritative. */
export class MonstrocityMotion {
    private pending: Input[] = [];
    private runId?: string;
    private sessionId?: string;

    reset() { this.pending = []; this.runId = undefined; this.sessionId = undefined; }
    accept(snapshot: Snapshot) {
        const run = snapshot.run, session = snapshot.session;
        if (run?.id !== this.runId || session?.id !== this.sessionId || run?.combat || run?.status !== 'active') this.pending = [];
        this.runId = run?.id; this.sessionId = session?.id;
        const acknowledged = session?.lastAcceptedInputSequence ?? 0;
        this.pending = this.pending.filter(input => input.sequence > acknowledged);
    }
    add(input: Input) { this.pending.push(input); }
    position(snapshot: Snapshot, config: Config): Point | undefined {
        const run = snapshot.run;
        if (!run || run.status !== 'active' || run.combat) return run?.position;
        let position = run.position;
        const map = mapFor(run.mapVersion), step = config.moveUnitsPerSecond * config.transport.inputTickMs / 1000;
        for (const input of this.pending) {
            const length = Math.max(1, Math.hypot(input.moveX, input.moveZ));
            position = movePoint(position, input.moveX / length * step, input.moveZ / length * step, map);
        }
        return position;
    }
}

/** A small dead zone prevents thumb jitter from leaving the explorer walking. */
export function stickInput(dx: number, dy: number) {
    const distance = Math.hypot(dx, dy), deadZone = 6, radius = 42;
    if (distance <= deadZone) return { x: 0, y: 0 };
    const strength = Math.min(1, (distance - deadZone) / (radius - deadZone));
    return { x: dx / distance * strength, y: dy / distance * strength };
}

/** Keep the fractional tick, but never manufacture catch-up input after a UI stall. */
export function inputTickBudget(remainder: number, elapsed: number, interval: number) {
    return Math.min(interval * 2 - 1e-9, remainder + Math.min(.05, elapsed));
}
