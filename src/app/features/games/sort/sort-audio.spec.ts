import { SortAudio } from './sort-audio';
describe('Sort reward audio', () => {
  it('is silent until a user gesture unlocks audio', () => {
    const create = spyOn(window, 'AudioContext');
    const audio = new SortAudio();
    audio.celebrate(true);
    expect(create).not.toHaveBeenCalled();
  });
  it('renders a finite, audible, non-clipping victory chime', async () => {
    const offline = new OfflineAudioContext(1, 44100 * 2, 44100);
    const proxy = new Proxy(offline, { get(target, key) {
      if (key === 'state') return 'running';
      if (key === 'resume') return () => Promise.resolve();
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    }});
    spyOn(window, 'AudioContext').and.returnValue(proxy as unknown as AudioContext);
    const audio = new SortAudio(); audio.unlock(); audio.celebrate(true);
    const rendered = await offline.startRendering(), data = rendered.getChannelData(0);
    let peak = 0; for (const sample of data) { expect(Number.isFinite(sample)).toBeTrue(); peak = Math.max(peak, Math.abs(sample)); }
    expect(peak).toBeGreaterThan(.01); expect(peak).toBeLessThan(.5);
    expect(Math.abs(data[data.length - 1])).toBeLessThan(.0001);
  });
});
