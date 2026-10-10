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
