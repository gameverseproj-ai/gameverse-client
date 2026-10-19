import { WorldRenderQuality } from './world-render-quality';

describe('World render quality', () => {
  it('caps mobile pixels and reduces quality on sustained slow frames', () => {
    const quality = new WorldRenderQuality(true, 3, 412, 915);
    const initial = quality.pixelRatio;
    expect(initial).toBeLessThanOrEqual(1.5);
    for (let i = 0; i < 200; i++) quality.sample(1 / 25);
    expect(quality.pixelRatio).toBeLessThan(initial);
    for (let i = 0; i < 2000; i++) quality.sample(1 / 20);
    expect(quality.pixelRatio).toBe(.75);
  });
  it('keeps fast devices sharp and ignores resume stalls', () => {
    const quality = new WorldRenderQuality(true, 3, 412, 915);
    for (let i = 0; i < 600; i++) quality.sample(1 / 60);
    for (let i = 0; i < 10; i++) quality.sample(2);
    expect(quality.pixelRatio).toBe(1.5);
    const desktop = new WorldRenderQuality(false, 2, 1920, 1080);
    for (let i = 0; i < 600; i++) desktop.sample(.1);
    expect(desktop.pixelRatio).toBe(2);
  });
});
