import { createPractice, RacquetMatch, SPORT_RULES } from './racquet-sports';
import { RACKETS, TennisProfile } from './tennis.api';
const profile: TennisProfile = {
  power: 1,
  endurance: 1,
  coins: 0,
  racket: 'starter',
  owned: ['starter'],
  activeSeconds: 0,
};
describe('Racquet sports practice', () => {
  for (const sport of ['ping-pong', 'squash', 'badminton'] as const) {
    it(`${sport}: bot returns a valid serve and a missed response scores`, () => {
      const match = new RacquetMatch(profile, RACKETS, sport);
      match.swing();
      let returned = false;
      for (
        let i = 0;
        i < 1200 && match.state.score + match.state.rivalScore === 0;
        i++
      ) {
        match.tick(1 / 60);
        returned ||= match.state.rally > 0;
        expect(Number.isFinite(match.state.y)).toBeTrue();
      }
      expect(returned).toBeTrue();
      expect(match.state.rivalScore).toBe(1);
      expect(SPORT_RULES[sport].points).toBe(sport === 'badminton' ? 21 : 11);
    });
    it(`${sport}: factory starts a real playable mode`, () => {
      const match = createPractice(profile, RACKETS, sport);
      match.swing();
      match.tick(1 / 60);
      expect(match.state.phase).toBe('rally');
      expect(match.state.activeSeconds).toBeGreaterThan(0);
    });
  }
  it('squash places both players on the same side', () => {
    const m = new RacquetMatch(profile, RACKETS, 'squash');
    expect(m.state.playerZ).toBeGreaterThan(0);
    expect(m.state.opponentZ).toBeGreaterThan(0);
  });
});


describe('Complete variation matches', () => {
  for (const sport of ['ping-pong', 'badminton', 'squash'] as const) {
    it(`${sport}: completes a match with legal serving and freezes the final score`, () => {
      const match = new RacquetMatch(profile, RACKETS, sport);
      for (let frame = 0; frame < 30000 && match.state.phase !== 'finished'; frame++) {
        if (match.state.phase === 'serve' && match.state.serving) match.swing();
        match.tick(1 / 60);
      }
      expect(match.state.phase).toBe('finished');
      const score = [match.state.score, match.state.rivalScore];
      expect(Math.max(...score)).toBeGreaterThanOrEqual(SPORT_RULES[sport].points);
      expect(Math.abs(score[0] - score[1]) >= 2 || Math.max(...score) === SPORT_RULES[sport].cap).toBeTrue();
      match.swing(); match.tick(.2);
      expect([match.state.score, match.state.rivalScore]).toEqual(score);
    });
    it(`${sport}: uses elapsed time consistently at 20 and 60 fps`, () => {
      const slow = new RacquetMatch(profile, RACKETS, sport);
      const fast = new RacquetMatch(profile, RACKETS, sport);
      slow.swing(); fast.swing();
      for (let i = 0; i < 10; i++) slow.tick(1 / 20);
      for (let i = 0; i < 30; i++) fast.tick(1 / 60);
      expect(slow.state.x).toBeCloseTo(fast.state.x, 6);
      expect(slow.state.y!).toBeCloseTo(fast.state.y!, 6);
      expect(slow.state.z).toBeCloseTo(fast.state.z, 6);
      expect(slow.state.activeSeconds).toBeCloseTo(.5, 6);
    });
  }
});
