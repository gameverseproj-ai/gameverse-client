import { COLORS, TetrisEngine } from './tetris-engine';

/** Glossy candy blocks dropping into a lit factory well. Resolution independent. */
export class TetrisRenderer {
  private well?: HTMLCanvasElement;
  private wellKey = '';
  constructor(private readonly ctx: CanvasRenderingContext2D) {}

  render(engine: TetrisEngine, flash = 0): void {
    const c = this.ctx, w = 300, h = 600, cw = w / engine.rules.columns, ch = h / engine.rules.rows;
    c.clearRect(0, 0, w, h);
    c.drawImage(this.wellCanvas(w, h, engine.rules.columns, engine.rules.rows), 0, 0, w, h);
    for (let y = 0; y < engine.rules.rows; y++) for (let x = 0; x < engine.rules.columns; x++) {
      const type = engine.board[y][x]; if (type) this.block(x * cw, y * ch, cw, ch, COLORS[type]);
    }
    if (!engine.gameOver) {
      const p = engine.current, ghost = engine.ghostY();
      // Ghost: a translucent candy shell that shows where the piece will land.
      if (ghost !== p.y) p.matrix.forEach((row, y) => row.forEach((v, x) => { if (v) {
        const gx = (p.x + x) * cw, gy = (ghost + y) * ch;
        c.fillStyle = COLORS[p.type] + '2e'; c.beginPath(); c.roundRect(gx + 2, gy + 2, cw - 4, ch - 4, 6); c.fill();
        c.strokeStyle = COLORS[p.type] + 'aa'; c.lineWidth = 1.5; c.setLineDash([3, 3]); c.stroke(); c.setLineDash([]);
      } }));
      p.matrix.forEach((row, y) => row.forEach((v, x) => { if (v) this.block((p.x + x) * cw, (p.y + y) * ch, cw, ch, COLORS[p.type], true); }));
    }
    if (flash > 0) {
      // Cleared rows: a bright flash that fades, plus sparks flying out of each row.
      for (const row of engine.lastClear) {
        const g = c.createLinearGradient(0, row * ch, w, row * ch);
        g.addColorStop(0, `rgba(255,245,200,${flash * .35})`); g.addColorStop(.5, `rgba(255,255,255,${flash * .95})`); g.addColorStop(1, `rgba(255,245,200,${flash * .35})`);
        c.fillStyle = g; c.fillRect(0, row * ch, w, ch);
        const spread = 1 - flash;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2 + row, speed = 60 + (i % 4) * 28;
          const px = w / 2 + Math.cos(a) * speed * spread * 2.2, py = row * ch + ch / 2 + Math.sin(a) * speed * spread + spread * spread * 90;
          c.fillStyle = ['#fff6b0', '#ffd0f0', '#c6f3ff', '#d9ffd0'][i % 4]; c.globalAlpha = flash;
          c.beginPath(); c.arc(px, py, 2.4 + (i % 3), 0, Math.PI * 2); c.fill();
        }
        c.globalAlpha = 1;
      }
    }
    if (engine.gameOver) { c.fillStyle = '#1a123a66'; c.fillRect(0, 0, w, h); }
  }

  /** The empty well: a lit violet chamber with soft socket tiles, painted once. */
  private wellCanvas(w: number, h: number, columns: number, rows: number): HTMLCanvasElement {
    const key = `${columns}x${rows}`;
    if (this.well && this.wellKey === key) return this.well;
    const dpr = Math.min(2, window.devicePixelRatio || 1), well = document.createElement('canvas');
    well.width = w * dpr; well.height = h * dpr; const c = well.getContext('2d')!; c.scale(dpr, dpr);
    const cw = w / columns, ch = h / rows;
    const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#5a3f9c'); sky.addColorStop(.55, '#3d2a78'); sky.addColorStop(1, '#2a1c5c');
    c.fillStyle = sky; c.fillRect(0, 0, w, h);
    for (const x of [w * .18, w * .82]) { const lamp = c.createRadialGradient(x, -10, 0, x, -10, w * .6); lamp.addColorStop(0, '#ffd9f455'); lamp.addColorStop(1, '#ffd9f400'); c.fillStyle = lamp; c.fillRect(0, 0, w, h); }
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
      c.fillStyle = (x + y) % 2 ? '#ffffff0d' : '#ffffff07'; c.beginPath(); c.roundRect(x * cw + 1.5, y * ch + 1.5, cw - 3, ch - 3, 5); c.fill();
      c.strokeStyle = '#ffffff10'; c.lineWidth = 1; c.stroke();
    }
    // Side rails and a warm floor glow, so the stack has somewhere to land.
    for (const x of [0, w - 3]) { c.fillStyle = '#e4c8ff44'; c.fillRect(x, 0, 3, h); }
    const floor = c.createLinearGradient(0, h - ch * 2, 0, h); floor.addColorStop(0, '#ff9ad000'); floor.addColorStop(1, '#ff9ad055'); c.fillStyle = floor; c.fillRect(0, h - ch * 2, w, ch * 2);
    this.well = well; this.wellKey = key; return well;
  }

  private block(x: number, y: number, w: number, h: number, color: string, active = false): void {
    const c = this.ctx, r = Math.min(7, w / 4), pad = 1.5;
    const body = c.createLinearGradient(x, y, x, y + h);
    body.addColorStop(0, mix(color, '#ffffff', .35)); body.addColorStop(.5, color); body.addColorStop(1, mix(color, '#2b0f45', .35));
    c.fillStyle = mix(color, '#2b0f45', .55); c.beginPath(); c.roundRect(x + pad, y + pad + 2, w - pad * 2, h - pad * 2, r); c.fill();
    c.fillStyle = body; c.beginPath(); c.roundRect(x + pad, y + pad, w - pad * 2, h - pad * 2 - 1.5, r); c.fill();
    c.strokeStyle = mix(color, '#ffffff', .55); c.lineWidth = 1; c.stroke();
    // Glossy cap and a sparkle; the active piece glows a little.
    c.fillStyle = '#ffffff7a'; c.beginPath(); c.roundRect(x + pad + 3, y + pad + 2.5, w - pad * 2 - 6, h * .26, 3); c.fill();
    c.fillStyle = '#ffffffd0'; c.beginPath(); c.arc(x + pad + 5, y + pad + 5, 1.8, 0, Math.PI * 2); c.fill();
    if (active) { c.strokeStyle = '#ffffff66'; c.lineWidth = 2; c.beginPath(); c.roundRect(x + pad + 1, y + pad + 1, w - pad * 2 - 2, h - pad * 2 - 3.5, r - 1); c.stroke(); }
  }
}

/** Mix a hex colour toward another, amount 0..1. */
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1, 7), 16), pb = parseInt(b.slice(1, 7), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
