import { GameRenderer, RenderContext } from '../base/game-renderer.interface';
import { SnakeCell, SnakeState } from './snake-engine';
import { SnakeItemId } from '../../../../core/models/snake.model';

/**
 * Code-drawn jelly garden: a sunlit lawn, a glossy pink snake that glides between
 * cells instead of jumping, and a glowing souvenir to collect. Crisp at any size, no downloads.
 */
export class SnakeRenderer implements GameRenderer<SnakeState> {
  private context!: RenderContext;
  private lawn?: HTMLCanvasElement;
  private lawnKey = '';
  private previous: SnakeCell[] = [];
  private current: SnakeCell[] = [];
  private lastTick = -1;
  private tickAt = 0;
  init(context: RenderContext): void { this.context = context; }

  render(s: SnakeState, now = performance.now()): void {
    const { ctx: c, width: w, height: h } = this.context, cell = w / s.gridSize;
    if (s.tick !== this.lastTick || this.current.length !== s.snake.length) {
      // A new tick: remember where every bead was, so it can glide to where it is now.
      this.previous = s.tick === this.lastTick + 1 ? this.current : s.snake.map(p => ({ ...p }));
      this.current = s.snake.map(p => ({ ...p }));
      this.lastTick = s.tick; this.tickAt = now;
    }
    const glide = s.running && !s.dead && !s.won ? Math.min(1, (now - this.tickAt) / Math.max(1, s.tickMs)) : 1;
    const ease = glide * glide * (3 - 2 * glide);
    c.clearRect(0, 0, w, h);
    c.drawImage(this.lawnCanvas(w, h, s.gridSize), 0, 0, w, h);
    this.drawItem(s.food.item.id, (s.food.x + .5) * cell, (s.food.y + .5) * cell, cell * .92, now);

    // Interpolated bead positions. Bead i was at previous[i-1] (or previous[0] for the head).
    const points = s.snake.map((p, i) => {
      const from = i === 0 ? this.previous[0] : this.previous[i - 1];
      if (!from) return { x: (p.x + .5) * cell, y: (p.y + .5) * cell };
      return { x: (from.x + (p.x - from.x) * ease + .5) * cell, y: (from.y + (p.y - from.y) * ease + .5) * cell };
    });
    // Ground shadow, then the connected jelly body.
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = '#2f6a2f33'; c.lineWidth = cell * .7;
    c.beginPath(); points.forEach((p, i) => i ? c.lineTo(p.x, p.y + cell * .14) : c.moveTo(p.x, p.y + cell * .14)); c.stroke();
    c.strokeStyle = '#c93b8f'; c.lineWidth = cell * .66;
    c.beginPath(); points.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke();
    for (let i = points.length - 1; i >= 0; i--) {
      const { x, y } = points[i], head = i === 0, pulse = 1 + (head ? 0 : Math.sin(now / 160 - i * .55) * .03);
      c.save(); c.translate(x, y); c.scale(pulse, pulse);
      const r = cell * (head ? .47 : .42);
      const jelly = c.createRadialGradient(-r * .3, -r * .38, r * .1, 0, 0, r * 1.15);
      jelly.addColorStop(0, head ? '#ffe3f2' : '#ffc1e3'); jelly.addColorStop(.4, head ? '#ff8fd0' : '#fb79c3'); jelly.addColorStop(1, '#b8318b');
      c.fillStyle = jelly; c.beginPath(); c.ellipse(0, 0, r, r * .96, 0, 0, Math.PI * 2); c.fill();
      // Candy stripe every other bead, and a glossy highlight on every bead.
      if (!head && i % 2 === 0) { c.fillStyle = '#ffffff30'; c.beginPath(); c.ellipse(0, 0, r * .55, r * .55, 0, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#ffffff85'; c.beginPath(); c.ellipse(-r * .3, -r * .48, r * .34, r * .16, -.4, 0, Math.PI * 2); c.fill();
      if (head) this.drawFace(c, cell, s, now);
      c.restore();
    }
    if (s.dead) { c.fillStyle = '#5a1a4a22'; c.fillRect(0, 0, w, h); }
  }

  private drawFace(c: CanvasRenderingContext2D, cell: number, s: SnakeState, now: number): void {
    const rotation = { RIGHT: 0, DOWN: Math.PI / 2, LEFT: Math.PI, UP: -Math.PI / 2 }[s.direction]; c.rotate(rotation);
    const blink = s.dead ? 0 : Math.max(0, 1 - Math.abs(((now / 2900) % 1) - .5) * 40);
    const tongue = s.dead ? 0 : Math.max(0, Math.sin(now / 420)) * (Math.floor(now / 1700) % 3 === 0 ? 1 : 0);
    if (tongue) { c.strokeStyle = '#ff5f93'; c.lineWidth = cell * .06; c.lineCap = 'round'; c.beginPath(); c.moveTo(cell * .42, 0); c.lineTo(cell * (.42 + .22 * tongue), 0); c.moveTo(cell * (.42 + .22 * tongue), 0); c.lineTo(cell * (.5 + .22 * tongue), -cell * .06); c.moveTo(cell * (.42 + .22 * tongue), 0); c.lineTo(cell * (.5 + .22 * tongue), cell * .06); c.stroke(); }
    for (const side of [-1, 1]) {
      // Blush, then big friendly eyes with a sparkle; crossed eyes when the run ends.
      c.fillStyle = '#ff8fb966'; c.beginPath(); c.ellipse(cell * .05, side * cell * .3, cell * .1, cell * .06, 0, 0, Math.PI * 2); c.fill();
      if (s.dead) { c.strokeStyle = '#4a1f45'; c.lineWidth = cell * .05; c.beginPath(); c.moveTo(cell * .1, side * cell * .11); c.lineTo(cell * .26, side * cell * .25); c.moveTo(cell * .26, side * cell * .11); c.lineTo(cell * .1, side * cell * .25); c.stroke(); continue; }
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(cell * .17, side * cell * .18, cell * .1, cell * .12 * (1 - blink * .9), 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3b2144'; c.beginPath(); c.ellipse(cell * .2, side * cell * .18, cell * .055, cell * .075 * (1 - blink * .9), 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(cell * .22, side * cell * .18 - cell * .03, cell * .022, 0, Math.PI * 2); c.fill();
    }
    if (!s.dead) { c.strokeStyle = '#7a2a5c'; c.lineWidth = cell * .04; c.beginPath(); c.arc(cell * .22, cell * .02, cell * .1, -.7, .7); c.stroke(); }
  }

  /** The lawn never changes during a run, so it is painted once per board size. */
  private lawnCanvas(w: number, h: number, grid: number): HTMLCanvasElement {
    const key = `${w}x${h}x${grid}`;
    if (this.lawn && this.lawnKey === key) return this.lawn;
    const dpr = Math.min(2, window.devicePixelRatio || 1), lawn = document.createElement('canvas');
    lawn.width = w * dpr; lawn.height = h * dpr; const c = lawn.getContext('2d')!; c.scale(dpr, dpr);
    const cell = w / grid;
    const sun = c.createRadialGradient(w * .3, h * .2, 0, w * .5, h * .5, w * .85);
    sun.addColorStop(0, '#9ff086'); sun.addColorStop(.6, '#7fd96a'); sun.addColorStop(1, '#5cbf5c');
    c.fillStyle = sun; c.fillRect(0, 0, w, h);
    for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++) {
      c.fillStyle = (x + y) % 2 ? '#ffffff14' : '#2e7a3a12'; c.fillRect(x * cell, y * cell, cell, cell);
    }
    // Scattered clover, daisies and pebbles, placed by a stable hash so the garden is the same every run.
    const hash = (x: number, y: number, k: number) => { const v = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return v - Math.floor(v); };
    for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++) {
      const kind = hash(x, y, 1), ox = (x + .25 + hash(x, y, 2) * .5) * cell, oy = (y + .25 + hash(x, y, 3) * .5) * cell;
      if (kind < .07) { for (let i = 0; i < 5; i++) { c.fillStyle = '#ffffffd8'; c.beginPath(); c.arc(ox + Math.cos(i * 1.257) * cell * .08, oy + Math.sin(i * 1.257) * cell * .08, cell * .05, 0, Math.PI * 2); c.fill(); } c.fillStyle = '#ffd34a'; c.beginPath(); c.arc(ox, oy, cell * .05, 0, Math.PI * 2); c.fill(); }
      else if (kind < .13) { c.fillStyle = hash(x, y, 4) < .5 ? '#ff9ad0' : '#b58cff'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(ox + Math.cos(i * 1.57) * cell * .06, oy + Math.sin(i * 1.57) * cell * .06, cell * .05, 0, Math.PI * 2); c.fill(); } c.fillStyle = '#fff7c2'; c.beginPath(); c.arc(ox, oy, cell * .035, 0, Math.PI * 2); c.fill(); }
      else if (kind < .22) { c.strokeStyle = '#3f9a44aa'; c.lineWidth = cell * .05; c.lineCap = 'round'; c.beginPath(); c.moveTo(ox, oy + cell * .12); c.quadraticCurveTo(ox + cell * .05, oy, ox - cell * .02, oy - cell * .12); c.moveTo(ox + cell * .1, oy + cell * .12); c.quadraticCurveTo(ox + cell * .12, oy, ox + cell * .18, oy - cell * .08); c.stroke(); }
      else if (kind < .25) { c.fillStyle = '#d6cbe9'; c.beginPath(); c.ellipse(ox, oy, cell * .1, cell * .07, hash(x, y, 5), 0, Math.PI * 2); c.fill(); c.fillStyle = '#ffffff70'; c.beginPath(); c.ellipse(ox - cell * .03, oy - cell * .025, cell * .04, cell * .02, 0, 0, Math.PI * 2); c.fill(); }
    }
    // A soft vignette keeps the eye on the middle and the edges feel like hedges.
    const edge = c.createRadialGradient(w / 2, h / 2, w * .35, w / 2, h / 2, w * .78);
    edge.addColorStop(0, '#1f5a2a00'); edge.addColorStop(1, '#1f5a2a66'); c.fillStyle = edge; c.fillRect(0, 0, w, h);
    this.lawn = lawn; this.lawnKey = key; return lawn;
  }

  private drawItem(id: SnakeItemId, x: number, y: number, size: number, now: number): void {
    const c = this.context.ctx, bob = Math.sin(now / 480) * size * .05, pulse = .9 + Math.sin(now / 380) * .1;
    c.save(); c.translate(x, y);
    // Glow halo and ground shadow, so the souvenir reads from across the garden.
    const halo = c.createRadialGradient(0, 0, size * .1, 0, 0, size * .95 * pulse);
    halo.addColorStop(0, '#fff8b8aa'); halo.addColorStop(.5, '#ffe67a44'); halo.addColorStop(1, '#ffe67a00');
    c.fillStyle = halo; c.beginPath(); c.arc(0, 0, size * .95 * pulse, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2d6b3444'; c.beginPath(); c.ellipse(0, size * .4, size * .36, size * .11, 0, 0, Math.PI * 2); c.fill();
    c.translate(0, bob); c.scale(size, size);
    const box = (x: number, y: number, w: number, h: number, color: string) => { c.fillStyle = color; c.beginPath(); c.roundRect(x, y, w, h, .07); c.fill(); };
    if (id === 'crystal') {
      for (const [x, y, k, color, light] of [[-.2, .04, .6, '#5ff0c8', '#c8fff0'], [.17, .12, .5, '#6cc2ff', '#d6efff'], [0, -.12, 1, '#b48bff', '#ead9ff']] as const) {
        c.save(); c.translate(x, y); c.scale(k, k);
        c.fillStyle = color; c.beginPath(); c.moveTo(0, -.4); c.lineTo(.23, -.1); c.lineTo(.13, .35); c.lineTo(-.14, .35); c.lineTo(-.2, -.1); c.closePath(); c.fill();
        c.fillStyle = light; c.beginPath(); c.moveTo(0, -.4); c.lineTo(-.2, -.1); c.lineTo(-.14, .35); c.lineTo(-.03, .3); c.lineTo(-.06, -.1); c.closePath(); c.fill();
        c.strokeStyle = '#ffffffcc'; c.lineWidth = .03; c.beginPath(); c.moveTo(0, -.4); c.lineTo(.23, -.1); c.lineTo(.13, .35); c.stroke(); c.restore();
      }
    } else if (id === 'tree') {
      box(-.07, .1, .14, .3, '#b86f93');
      for (const [y, r, color] of [[.05, .32, '#5ddba8'], [-.16, .24, '#86f0c6'], [-.32, .14, '#c6ffe7']] as const) { c.fillStyle = color; c.beginPath(); c.arc(0, y, r, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#ffffff70'; c.beginPath(); c.ellipse(-.1, -.2, .09, .05, -.5, 0, Math.PI * 2); c.fill();
      for (const [px, py] of [[-.18, .06], [.14, -.04], [.02, -.3]]) { c.fillStyle = '#ff8ac4'; c.beginPath(); c.arc(px, py, .045, 0, Math.PI * 2); c.fill(); }
    } else if (id === 'island') {
      c.fillStyle = '#9d7ad6'; c.beginPath(); c.moveTo(-.4, 0); c.lineTo(.4, 0); c.lineTo(.12, .42); c.closePath(); c.fill();
      c.fillStyle = '#7ee6b4'; c.beginPath(); c.ellipse(0, 0, .43, .14, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#b7ffdc'; c.beginPath(); c.ellipse(-.1, -.03, .22, .06, 0, 0, Math.PI * 2); c.fill();
      box(.13, 0, .08, .32, '#7fd1ff'); box(-.11, -.3, .15, .25, '#c2a0ff'); box(-.11, -.36, .15, .06, '#ecdcff');
    } else {
      const color = id === 'temple' ? '#ffc257' : id === 'factory' ? '#c48bff' : '#ff8a8e';
      const light = id === 'temple' ? '#ffe9a8' : id === 'factory' ? '#e6ccff' : '#ffc5c7';
      box(-.34, -.2, .68, .55, color); box(-.34, -.2, .68, .1, light);
      if (id === 'temple') { box(-.27, -.32, .54, .16, '#ffd978'); box(-.18, -.44, .36, .16, '#fff0bc'); }
      if (id === 'factory') { box(-.28, -.47, .15, .3, '#bba2ff'); box(.1, -.4, .17, .23, '#ecafff'); box(-.3, -.52, .21, .09, '#98e8f0'); }
      if (id === 'gym') { box(-.19, -.39, .38, .2, '#ffd184'); box(-.43, -.31, .86, .07, '#eec8ff'); }
      box(-.105, .06, .21, .29, '#4b2f59'); box(-.27, -.08, .1, .1, '#fff6cf'); box(.17, -.08, .1, .1, '#fff6cf');
      c.strokeStyle = '#fff1cf'; c.lineWidth = .03; c.beginPath(); c.arc(0, .12, .11, Math.PI, 0); c.stroke();
    }
    c.restore();
  }
  async loadTheme(_theme: string): Promise<void> {}
  destroy(): void {}
}
