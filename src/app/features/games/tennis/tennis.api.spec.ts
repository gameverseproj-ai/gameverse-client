import { MockTennisApi } from './tennis.api';
describe('Tennis mock adapter', () => {
  beforeEach(() => localStorage.removeItem('gameverse.tennis.mock.v1'));
  afterEach(() => localStorage.removeItem('gameverse.tennis.mock.v1'));
  it('does not charge twice for an owned racket', async () => {
    const api = new MockTennisApi();
    await api.profile();
    const a = await api.equip('spin');
    const b = await api.equip('spin');
    expect(a.coins).toBe(100);
    expect(b.coins).toBe(100);
    expect(b.racket).toBe('spin');
    await expectAsync(api.equip('power')).toBeRejectedWithError(
      'Not enough demo coins',
    );
  });
  it('keeps room previews waiting and validates usernames', async () => {
    const api = new MockTennisApi();
    await expectAsync(api.createRoom('tennis', '!')).toBeRejected();
    const r = await api.createRoom('tennis', 'friend_1');
    expect(r.status).toBe('waiting');
    expect(r.invitedUsername).toBe('friend_1');
    await api.cancelRoom(r.id);
    await api.cancelRoom(r.id);
  });
  it('caps upgrades and persists the separate demo profile', async () => {
    const api = new MockTennisApi();
    await api.profile();
    const reps = Array.from({ length: 20 }, (_, i) => ({
      sequence: i + 1,
      elapsedMs: i * 600,
      action: 'rep' as const,
    }));
    for (let i = 0; i < 20; i++) await api.train(await api.startTraining(), reps);
    await api.completePractice(120);
    const loaded = await new MockTennisApi().profile();
    expect(loaded.power).toBe(10);
    expect(loaded.endurance).toBe(2);
    expect(loaded.coins).toBe(200);
  });
});
