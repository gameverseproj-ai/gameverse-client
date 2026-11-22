import { levelBoard, pour, won } from './sort-engine';
describe('Sort rules', () => {
    it('pours only matching top colors up to capacity without mutating input', () => { const b = [[0, 1, 1], [1, 1, 1], []]; expect(pour(b, 0, 1)).toEqual([[0, 1], [1, 1, 1, 1], []]); expect(b[0]).toEqual([0, 1, 1]); expect(pour(b, 1, 0)).toEqual([[0, 1, 1, 1], [1, 1], []]); expect(pour([[0], [1]], 0, 1)).toBeNull(); expect(pour(b, 0, 0)).toBeNull(); });
    it('requires full single-color tubes', () => { expect(won([[0, 0], []])).toBeFalse(); expect(won([[0, 0, 0, 0], []])).toBeTrue(); });
    it('generates deterministic levels with exactly four layers per color', () => { for (let l = 1; l <= 30; l++) {
        const b = levelBoard(l);
        expect(b).toEqual(levelBoard(l));
        expect(won(b)).toBeFalse();
        for (let c = 0; c < b.length - 2; c++)
            expect(b.flat().filter(x => x === c).length).toBe(4);
    } });
    it('has a legal solution for the first thirty levels', () => { for (let l = 1; l <= 30; l++) {
        const queue = [levelBoard(l)], seen = new Set<string>();
        let solved = false;
        for (let q = 0; q < queue.length && q < 100000; q++) {
            const b = queue[q];
            if (won(b)) {
                solved = true;
                break;
            }
            for (let a = 0; a < b.length; a++)
                for (let t = 0; t < b.length; t++) {
                    const n = pour(b, a, t);
                    if (!n)
                        continue;
                    const key = n.map(x => x.join(',')).sort().join('|');
                    if (!seen.has(key)) {
                        seen.add(key);
                        queue.push(n);
                    }
                }
        }
        expect(solved).withContext('level ' + l).toBeTrue();
    } });
});
