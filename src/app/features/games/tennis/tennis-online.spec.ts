import { OnlineMatch } from './tennis-online';
import { MatchSnapshot, SnapshotPlayer } from './tennis-realtime';

const A = 'aaaaaaaa-0000-0000-0000-000000000000';
const B = 'bbbbbbbb-0000-0000-0000-000000000000';
const players: SnapshotPlayer[] = [
  { id: A, position: { x: 1, z: 7 }, stamina: 90, side: 1 },
  { id: B, position: { x: -2, z: -7 }, stamina: 80, side: -1 },
];
const snapshot = (over: Partial<MatchSnapshot> = {}): MatchSnapshot => ({
  type: 'match.snapshot',
  matchId: 'm',
  serverTick: 10,
  lastProcessedSequence: 3,
  ball: { position: { x: 1, z: 2 }, velocity: { x: 0, z: 8 } },
  players,
  score: { [A]: 2, [B]: 1 },
  phase: 'rally',
  serverId: A,
  rally: 4,
  activeSeconds: 12.5,
  ...over,
});

describe('Online match model', () => {
  it('keeps the first player in their own perspective', () => {
    const m = new OnlineMatch('m', A, players);
    m.applySnapshot(snapshot(), 1000);
    m.tick(1000, 0.016);
    expect(m.side).toBe(1);
    expect(m.state.player).toBe(1);
    expect(m.state.score).toBe(2);
    expect(m.state.rivalScore).toBe(1);
    expect(m.state.stamina).toBe(90);
    expect(m.state.x).toBe(1);
    expect(m.state.z).toBe(2);
    expect(m.serving).toBeTrue();
  });
  it('mirrors the court and the inputs for the far player', () => {
    const m = new OnlineMatch('m', B, players);
    m.applySnapshot(snapshot(), 1000);
    m.tick(1000, 0.016);
    expect(m.side).toBe(-1);
    expect(m.state.player).toBe(2);
    expect(m.state.x).toBe(-1);
    expect(m.state.z).toBe(-2);
    expect(m.state.score).toBe(1);
    expect(m.serving).toBeFalse();
    m.move(4);
    m.swing(0.5, 1);
    const frame = m.nextFrame();
    expect(frame.sequence).toBe(1);
    expect(frame.moveX).toBeLessThan(0);
    expect(frame.swing).toBe('topspin');
    expect(frame.aimX).toBe(-0.5);
    expect(m.nextFrame().swing).toBe('none');
  });
  it('extrapolates the ball between snapshots during a rally only', () => {
    const m = new OnlineMatch('m', A, players);
    m.applySnapshot(snapshot(), 1000);
    m.tick(1050, 0.05);
    expect(m.state.z).toBeCloseTo(2 + 8 * 0.05, 5);
    m.tick(1500, 0.05);
    expect(m.state.z).toBeCloseTo(2 + 8 * 0.12, 5);
    m.applySnapshot(snapshot({ phase: 'serve' }), 2000);
    m.tick(2100, 0.05);
    expect(m.state.z).toBe(2);
    expect(m.state.phase).toBe('serve');
  });
});
