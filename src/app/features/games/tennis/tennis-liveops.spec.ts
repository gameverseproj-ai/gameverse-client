import { signal } from '@angular/core';
import { TennisComponent } from './tennis.component';

// Exercise event lifecycle without constructing the WebGL scene or a real session.
describe('Tennis live-ops visibility', () => {
  const setup = (request: () => Promise<unknown>) => Object.assign(
    Object.create(TennisComponent.prototype), {
      api: { championship: request }, disposed: false, championshipLoading: false,
      championship: signal<any>({ id: 'old' }), standings: signal<any>({}),
      page: signal('cup'),
    });
  it('closes and hides an event withdrawn by the server', async () => {
    const c = setup(async () => null);
    await c.loadChampionship();
    expect(c.championship()).toBeNull();
    expect(c.standings()).toBeNull();
    expect(c.page()).toBe('club');
  });
  it('does not leave a stale event visible after a failed refresh', async () => {
    const c = setup(async () => { throw new Error('offline'); });
    await c.loadChampionship();
    expect(c.championship()).toBeNull();
    expect(c.page()).toBe('club');
  });
  it('shows a newly activated event without navigating away from play', async () => {
    const c = setup(async () => ({ id: 'new' }));
    c.page.set('play');
    await c.loadChampionship();
    expect(c.championship().id).toBe('new');
    expect(c.page()).toBe('play');
    expect(c.standings()).toBeNull();
  });
});
