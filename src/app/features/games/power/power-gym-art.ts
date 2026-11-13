/** A candy-stone training hall at sunset: warm sky, bunting, lit arches and a glowing ring. */
export function drawPowerGym(c: CanvasRenderingContext2D, w: number, h: number, now = 0): void {
  c.save();
  const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#2a1f5e'); sky.addColorStop(.35, '#6a3d7e'); sky.addColorStop(.62, '#c45c7a'); sky.addColorStop(.74, '#ff9a6a'); sky.addColorStop(1, '#4a2f66');
  c.fillStyle = sky; c.fillRect(0, 0, w, h);
  const sun = c.createRadialGradient(w / 2, h * .62, 5, w / 2, h * .62, w * .55); sun.addColorStop(0, '#ffd59a88'); sun.addColorStop(.4, '#ff9f6a33'); sun.addColorStop(1, '#ff9f6a00'); c.fillStyle = sun; c.fillRect(0, 0, w, h);
  // Stars high up, and two soft spotlights crossing from the ceiling.
  for (let i = 0; i < 26; i++) { const x = ((i * 97) % 211) / 211 * w, y = ((i * 53) % 89) / 89 * h * .3, tw = .5 + .5 * Math.sin(now / 700 + i); c.fillStyle = `rgba(255,240,220,${.35 + tw * .5})`; c.beginPath(); c.arc(x, y, 1 + (i % 3) * .5, 0, Math.PI * 2); c.fill(); }
  for (const side of [-1, 1]) {
    const beam = c.createLinearGradient(w / 2 + side * w * .45, 0, w / 2, h * .8); beam.addColorStop(0, '#fff2d040'); beam.addColorStop(1, '#fff2d000');
    c.fillStyle = beam; c.beginPath(); c.moveTo(w / 2 + side * w * .45, 0); c.lineTo(w / 2 + side * w * .55, 0); c.lineTo(w / 2 - side * w * .1, h * .82); c.lineTo(w / 2 - side * w * .3, h * .82); c.closePath(); c.fill();
  }
  // Rounded masonry and a luminous arch give the hall an interior of its own.
  const archW = Math.min(w * .55, 270), left = (w - archW) / 2, top = h * .13;
  c.lineWidth = 18; c.strokeStyle = '#a86b8a'; c.beginPath(); c.moveTo(left, h * .73); c.lineTo(left, top + archW / 2); c.arc(w / 2, top + archW / 2, archW / 2, Math.PI, 0); c.lineTo(left + archW, h * .73); c.stroke();
  c.lineWidth = 6; c.strokeStyle = '#d99ab4'; c.stroke();
  c.lineWidth = 3; c.strokeStyle = '#fff0c8'; c.shadowColor = '#ffb073'; c.shadowBlur = 18; c.stroke(); c.shadowBlur = 0;
  for (const side of [0, 1]) {
    const x = side ? w - 52 : 14;
    for (let y = 54; y < h * .72; y += 39) {
      const stone = c.createLinearGradient(x, y, x, y + 33); stone.addColorStop(0, '#d49aae'); stone.addColorStop(1, '#8a5a86');
      c.fillStyle = '#5a3860'; c.beginPath(); c.roundRect(x, y + 3, 38, 33, 9); c.fill();
      c.fillStyle = stone; c.beginPath(); c.roundRect(x, y, 38, 33, 9); c.fill();
      c.fillStyle = '#ffffff40'; c.beginPath(); c.roundRect(x + 5, y + 4, 28, 7, 4); c.fill();
    }
    const lampX = side ? w - 76 : 76, flicker = .85 + .15 * Math.sin(now / 230 + side * 2);
    c.shadowColor = '#ffb064'; c.shadowBlur = 26 * flicker; c.fillStyle = '#fff0b8'; c.beginPath(); c.roundRect(lampX - 8, h * .29, 16, 26, 8); c.fill(); c.shadowBlur = 0;
    c.fillStyle = '#6a4a6e'; c.beginPath(); c.roundRect(lampX - 12, h * .29 + 25, 24, 7, 3); c.fill();
  }
  // Bunting strung across the top of the hall.
  c.strokeStyle = '#ffe9c0'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, h * .06); c.quadraticCurveTo(w / 2, h * .17, w, h * .06); c.stroke();
  const flags = ['#ff7fb5', '#ffd84a', '#5ce6ff', '#c88dff', '#64eea0', '#ffa454'];
  for (let i = 0; i < 12; i++) { const t = (i + .5) / 12, x = t * w, y = h * .06 + (h * .17 - h * .06) * 2 * t * (1 - t) * 2 / 2 + Math.sin(now / 900 + i) * 1.5; c.fillStyle = flags[i % flags.length]; c.beginPath(); c.moveTo(x - 9, y); c.lineTo(x + 9, y); c.lineTo(x, y + 16); c.closePath(); c.fill(); c.fillStyle = '#ffffff55'; c.beginPath(); c.moveTo(x - 9, y); c.lineTo(x - 2, y); c.lineTo(x - 2, y + 9); c.closePath(); c.fill(); }
  // Ring floor: a warm platform with perspective boards and a glowing rope circle.
  const floor = c.createLinearGradient(0, h * .65, 0, h); floor.addColorStop(0, '#6e4680'); floor.addColorStop(1, '#3a2850');
  c.fillStyle = floor; c.beginPath(); c.moveTo(0, h * .74); c.quadraticCurveTo(w / 2, h * .65, w, h * .74); c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill();
  const spot = c.createRadialGradient(w / 2, h * .8, 0, w / 2, h * .8, w * .4); spot.addColorStop(0, '#ffb98a55'); spot.addColorStop(1, '#ffb98a00'); c.fillStyle = spot; c.fillRect(0, h * .6, w, h * .4);
  for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(w / 2, h * .69); c.lineTo((i - 1) * w / 4, h); c.strokeStyle = '#ffd6f028'; c.lineWidth = 1.2; c.stroke(); }
  for (const y of [.79, .88, .99]) { c.beginPath(); c.moveTo(0, h * y); c.lineTo(w, h * y); c.strokeStyle = '#ffd6f02a'; c.stroke(); }
  c.beginPath(); c.ellipse(w / 2, h * .8, w * .34, h * .075, 0, 0, Math.PI * 2); c.strokeStyle = '#ffd08a'; c.lineWidth = 4; c.shadowColor = '#ff9a60'; c.shadowBlur = 16; c.stroke();
  c.strokeStyle = '#fff6dc'; c.lineWidth = 1.5; c.shadowBlur = 0; c.stroke();
  c.restore();
}
