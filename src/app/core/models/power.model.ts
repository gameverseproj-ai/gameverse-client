/** Server-owned progress returned by the Power bootstrap and action endpoints. */
export type PowerState = { strength: number; stage: number; hp: number; maxHp: number; best: number; hits: number; wins: number; day: string; reps: number[]; lastAt: number; repTimes: number[]; assigned: number[] };
/** Client sends only player intent; HP and progression are never submitted. */
export type PowerAction = { type: 'hit'; mode: 'battle' | 'machine'; pull: number; aim: number; aimY?: number } | { type: 'rep'; exercise: number };
