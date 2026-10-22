import { Point } from './monstrocity.types';
export interface Building {
    id: string;
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    color: number;
    interior?: boolean;
}
export const BUILDINGS: Building[] = [
    { id: 'bakery', x: -10, z: -11, w: 7, d: 6, h: 7, color: 0xbfa180 },
    { id: 'home', x: 0, z: -12, w: 7, d: 5, h: 8, color: 0xc7b59a },
    { id: 'workshop', x: 10, z: -11, w: 7, d: 6, h: 6, color: 0xa88c76 },
    { id: 'library', x: -12, z: 0, w: 5, d: 8, h: 6, color: 0xc0b29c },
    { id: 'house-east', x: 12, z: 0, w: 5, d: 8, h: 8, color: 0xaaa28b },
    { id: 'room', x: -10, z: 11, w: 7, d: 6, h: 5, color: 0xb99c7d, interior: true },
    { id: 'house-south', x: 1, z: 13, w: 7, d: 4, h: 7, color: 0xc1ad8a },
    { id: 'atelier', x: 11, z: 11, w: 6, d: 6, h: 5.5, color: 0xb5a38e },
];
export const SHELTER_CANDIDATES = [{ x: -9, z: -6.8 }, { x: 0, z: -8.2 }, { x: 10, z: -6.8 }, { x: -10, z: 11 }, { x: 11, z: 6.8 }];
export const CONTAINERS = [{ id: 'crate-start', x: -7, z: -5.8 }, { id: 'pantry', x: -9, z: 11 }, { id: 'crate-east', x: 8, z: -5.5 }, { id: 'crate-south', x: 7, z: 7 }, { id: 'crate-west', x: -8, z: 3 }, { id: 'cabinet', x: 2, z: -8 }];
export const RESIDENTS = [{ id: 'gardener', x: 3, z: 3 }, { id: 'keeper', x: -5, z: -6 }];
export function blocked(p: Point): boolean {
    if (Math.abs(p.x) > 17 || Math.abs(p.z) > 17)
        return true;
    for (const b of BUILDINGS) {
        if (b.interior) {
            // Front doorway is 2 units wide; room is accessible and shares the scene geometry.
            const dx = p.x - b.x, dz = p.z - b.z;
            if (Math.abs(dx) < b.w / 2 + .25 && Math.abs(dz) < b.d / 2 + .25) {
                if (Math.abs(dx) > b.w / 2 - .35 || dz > b.d / 2 - .35)
                    return true;
                if (dz < -b.d / 2 + .35 && Math.abs(dx) > 1)
                    return true;
            }
        }
        else if (Math.abs(p.x - b.x) < b.w / 2 + .28 && Math.abs(p.z - b.z) < b.d / 2 + .28)
            return true;
    }
    if (CONTAINERS.some(c => distance(c, p) < .5))
        return true;
    if (Math.abs(p.x - 15) < 1.35 && Math.abs(p.z + 7) < 2.85)
        return true;
    for (const [x, z] of [[-5, 1], [5, 1], [-4, 6], [7, -4]])
        if (Math.abs(p.x - x) < 1.1 && Math.abs(p.z - z) < 1.1)
            return true;
    return Math.hypot(p.x, p.z) < 1.5; // planted fountain island
}
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
export function movePoint(p: Point, x: number, z: number): Point {
    const next = { ...p };
    if (!blocked({ x: p.x + x, z: p.z }))
        next.x += x;
    if (!blocked({ x: next.x, z: p.z + z }))
        next.z += z;
    return next;
}
export function lineBlocked(a: Point, b: Point): boolean {
    for (let i = 1; i < 20; i++)
        if (blocked({ x: a.x + (b.x - a.x) * i / 20, z: a.z + (b.z - a.z) * i / 20 }))
            return true;
    return false;
}
