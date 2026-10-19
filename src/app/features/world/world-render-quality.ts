/** Downgrade sustained slow rendering, not one-off shader compilation or tab resumes. */
export class WorldRenderQuality {
  readonly mobile: boolean;
  pixelRatio: number;
  private warmup = 3;
  private elapsed = 0;
  private frames = 0;

  constructor(mobile: boolean, devicePixelRatio: number, width: number, height: number) {
    this.mobile = mobile;
    this.pixelRatio = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2,
      mobile ? Math.sqrt(1_200_000 / Math.max(1, width * height)) : 2);
  }

  sample(delta: number): boolean {
    if (!this.mobile || delta <= 0 || delta > .25) return false;
    if (this.warmup > 0) { this.warmup -= delta; return false; }
    this.elapsed += delta;
    this.frames++;
    if (this.elapsed < 2) return false;
    const fps = this.frames / this.elapsed;
    this.elapsed = 0; this.frames = 0;
    const next = Math.max(.75, this.pixelRatio * .8);
    if (fps >= 42 || next >= this.pixelRatio) return false;
    this.pixelRatio = next;
    this.warmup = 2;
    return true;
  }
}
