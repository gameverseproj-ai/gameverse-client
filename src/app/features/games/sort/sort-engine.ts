export const CAPACITY = 4;
export type Board = number[][];
export function pour(board: Board, from: number, to: number): Board | null {
    if (from === to || !board[from]?.length || !board[to] || board[to].length === CAPACITY)
        return null;
    const source = board[from], target = board[to], color = source[source.length - 1];
    if (target.length && target[target.length - 1] !== color)
        return null;
    let count = 0;
    for (let i = source.length - 1; i >= 0 && source[i] === color; i--)
        count++;
    count = Math.min(count, CAPACITY - target.length);
    const next = board.map(t => [...t]);
    next[from].splice(-count);
    next[to].push(...Array(count).fill(color));
    return next;
}
export function won(board: Board) { return board.every(t => !t.length || (t.length === CAPACITY && t.every(c => c === t[0]))); }
// Reverse legal single-layer pours from the solved state: every generated board has a solution.
export function levelBoard(level: number): Board {
    const colors = Math.min(6, 4 + Math.floor((level - 1) / 3));
    const board: Board = Array.from({ length: colors }, (_, c) => [c, c, c, c]);
    board.push([], []);
    let seed = level * 7919;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let n = 0; n < 160 + level * 12; n++) {
        const candidates: [
            number,
            number
        ][] = [];
        for (let a = 0; a < board.length; a++)
            for (let b = 0; b < board.length; b++)
                if (a !== b && board[a].length && board[b].length < 4 && (board[a].length === 1 || board[a].at(-2) === board[a].at(-1)))
                    candidates.push([a, b]);
        if (!candidates.length)
            break;
        const [a, b] = candidates[Math.floor(random() * candidates.length)];
        board[b].push(board[a].pop()!);
    }
    return board;
}
