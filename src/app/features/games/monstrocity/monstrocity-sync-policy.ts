import { Config } from './monstrocity.types';

/** Leave time for network latency before the authoritative disconnect deadline. */
export function syncDelay(transport: Config['transport'], moving: boolean, combat: boolean): number {
  const safeHeartbeat = Math.max(100, transport.disconnectAfterSeconds * 1000 * .4);
  if (combat) return Math.min(safeHeartbeat, Math.max(500, transport.syncIntervalMs));
  if (moving) {
    // Never collect more input time than the negotiated batch can represent.
    const batchWindow = transport.inputTickMs * Math.max(1, transport.maxBatchFrames - 1);
    return Math.min(safeHeartbeat, batchWindow, Math.max(1000, transport.syncIntervalMs));
  }
  return Math.min(5000, safeHeartbeat);
}

/** Keep stop samples within a movement batch, but don't manufacture idle batches. */
export function shouldSampleInput(x: number, y: number, bufferedFrames: number): boolean {
  return x !== 0 || y !== 0 || bufferedFrames > 0;
}
