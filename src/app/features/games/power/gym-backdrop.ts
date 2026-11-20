/** One decoded background shared by boxing and training; no per-frame texture allocation. */
let backdrop: HTMLImageElement | undefined;
export function drawGymBackdrop(c: CanvasRenderingContext2D, w: number, h: number): boolean {
  if (!backdrop && typeof Image !== 'undefined') {
    backdrop = new Image(); backdrop.decoding = 'async';
    backdrop.src = '/assets/arcade-art/gym-v2.jpg';
  }
  if (!backdrop?.complete || !backdrop.naturalWidth) return false;
  const scale = Math.max(w / backdrop.naturalWidth, h / backdrop.naturalHeight);
  const width = backdrop.naturalWidth * scale, height = backdrop.naturalHeight * scale;
  c.drawImage(backdrop, (w - width) / 2, (h - height) / 2, width, height);
  return true;
}
