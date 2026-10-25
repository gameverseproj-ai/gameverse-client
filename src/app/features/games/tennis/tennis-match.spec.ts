import { TennisMatch } from './tennis-match';
import { TennisProfile } from './tennis.api';
const profile: TennisProfile = {
  endurance: 1,
  power: 1,
  coins: 200,
  racket: 'starter',
  owned: ['starter'],
  activeSeconds: 0,
};
describe('Tennis practice model', () => {
  it('waits for serve and only counts active rally time', () => {
    const m = new TennisMatch(profile);
    for (let i = 0; i < 100; i++) m.tick(0.016);
    expect(m.state.activeSeconds).toBe(0);
    m.swing();
    m.tick(0.02);
    expect(m.state.activeSeconds).toBeGreaterThan(0);
    expect(m.state.z).toBeLessThan(7);
  });
  it('clamps movement to the court and recovers energy between points', () => {
    const m = new TennisMatch(profile);
    m.move(100);
    for (let i = 0; i < 300; i++) m.tick(0.02);
    expect(m.state.player).toBeLessThanOrEqual(4.5);
    m.state.stamina = 20;
    m.tick(0.02);
    expect(m.state.stamina).toBeGreaterThan(20);
  });
  it('finishes at five and ignores further serves', () => {
    const m = new TennisMatch(profile);
    m.state.rivalScore = 4;
    m.state.phase = 'rally';
    m.state.x = 4;
    m.state.player = -4;
    m.state.z = 9;
    (m as any).vz = 8;
    m.tick(0.02);
    expect(m.state.phase).toBe('finished');
    expect(m.state.rivalScore).toBe(5);
    m.swing();
    expect(m.state.phase).toBe('finished');
  });
  it('higher endurance reduces fatigue', () => {
    const a = new TennisMatch(profile),
      b = new TennisMatch({ ...profile, endurance: 10 });
    a.swing();
    b.swing();
    for (let i = 0; i < 30; i++) {
      a.tick(0.02);
      b.tick(0.02);
    }
    expect(b.state.stamina).toBeGreaterThan(a.state.stamina);
  });
  it('returns an incoming ball within reach without a tap and charges one hit',()=>{
    const m=new TennisMatch(profile);m.state.phase='rally';m.state.x=.5;m.state.z=6.59;m.state.player=.5;(m as any).vz=8;
    m.tick(.02);expect(m.state.rally).toBe(1);expect((m as any).vz).toBeLessThan(0);expect(m.state.stamina).toBeLessThan(98);
    m.tick(.02);expect(m.state.rally).toBe(1);
  });
  it('still loses the point when the avatar cannot reach the ball',()=>{
    const m=new TennisMatch(profile);m.state.phase='rally';m.state.x=4;m.state.z=8.39;m.state.player=-4;m.move(-4);(m as any).vz=8;
    m.tick(.02);expect(m.state.rivalScore).toBe(1);expect(m.state.rally).toBe(0);
  });

});
