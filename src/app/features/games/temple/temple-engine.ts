import { TempleDirection } from '../../../core/models/temple.model';
/** Pure 2048 rules, shared by the mock authority and tests. Each tile merges once. */
export function slide(board: number[], size: number, direction: TempleDirection) {
  const next = [...board]; let score = 0;
  const motions: { from: number; to: number }[] = [];
  const merges: number[] = [];
  for (let line = 0; line < size; line++) {
    const indices = Array.from({length:size}, (_, i) => {
      if (direction === 'left') return line * size + i;
      if (direction === 'right') return line * size + size - 1 - i;
      if (direction === 'up') return i * size + line;
      return (size - 1 - i) * size + line;
    });
    const sources = indices.filter(i => board[i]);
    const values = sources.map(i => board[i]), merged: number[] = [];
    for (let i = 0; i < values.length; i++) {
      const to = indices[merged.length];
      motions.push({from:sources[i],to});
      if (values[i] === values[i + 1]) { motions.push({from:sources[i+1],to}); merges.push(to); merged.push(values[i] * 2); score += values[i] * 2; i++; }
      else merged.push(values[i]);
    }
    indices.forEach((index, i) => next[index] = merged[i] ?? 0);
  }
  return { board: next, score, motions, merges, changed: next.some((value, i) => value !== board[i]) };
}
export function canMove(board: number[], size: number): boolean {
  return board.some((value, i) => !value || (i % size < size - 1 && value === board[i+1]) || (i + size < board.length && value === board[i+size]));
}
export function spawnTile(board: number[], fourChance: number, random = Math.random): void {
  const empty = board.map((value, i) => value ? -1 : i).filter(i => i >= 0);
  if (empty.length) board[empty[Math.min(empty.length-1,Math.floor(random()*empty.length))]] = random() < fourChance ? 4 : 2;
}
