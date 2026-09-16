import { EXERCISES, dailyExercises } from './power-exercises';
export { EXERCISES } from './power-exercises';
export const REP_TIMEOUT = 10000;
export type PowerState = { strength: number; stage: number; hp: number; best: number; hits: number; wins: number; day: string; reps: number[]; lastAt: number; repTimes: number[]; assigned: number[] };
export function health(stage: number): number { return Math.round(180 * Math.pow(stage, 1.35)); }
export function freshPower(): PowerState { return { strength: 20, stage: 1, hp: health(1), best: 0, hits: 0, wins: 0, day: '', reps: Array(60).fill(0), lastAt: 0, repTimes: Array(60).fill(0), assigned: [] }; }
export function accuracy(position: number): number { return Math.max(0, 1 - Math.abs(position - 75) / 75); }
export function damage(strength: number, position: number): number { return Math.round(strength * (0.5 + accuracy(position) * 2)); }
export function localDay(now: number): string { const d = new Date(now); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
export function punchZone(aim:number, aimY=0): 'head' | 'body' | null {
  const x=aim*124,y=aimY*115;
  if ((x/51)**2+((y+67)/58)**2<=1) return 'head';
  if ((x/68)**2+((y-33)/77)**2<=1) return 'body';
  return null;
}
export function strikeDamage(strength: number, pull: number, aim: number, aimY=0): number {
  if (!punchZone(aim,aimY) || pull < .08) return 0;
  return Math.round(strength * (.5 + pull * 2) * (1 - Math.abs(aim) * .6));
}
export type PowerAction = { type: 'hit'; mode: 'battle' | 'machine'; pull: number; aim: number; aimY?: number } | { type: 'rep'; exercise: number };
export function normalizePower(before: PowerState, now: number): PowerState {
  const state = structuredClone(before);
  // Migrate the original three exercise save without losing earned strength.
  if (state.reps.length === 3) state.reps = [...state.reps, ...Array(57).fill(0)];
  state.repTimes ??= Array(60).fill(0);
  state.assigned ??= [];
  if (state.day !== localDay(now)) {
    state.day = localDay(now); state.reps = Array(60).fill(0); state.repTimes = Array(60).fill(0); state.assigned = dailyExercises(state.day);
  }
  if (!state.assigned.length) state.assigned = dailyExercises(state.day);
  state.reps = state.reps.map((reps,i) => reps < EXERCISES[i].reps && now - state.repTimes[i] >= REP_TIMEOUT ? 0 : reps);
  return state;
}
export function applyPower(before: PowerState, action: PowerAction, now: number, preview = false): PowerState {
  const state = normalizePower(before, now);
  if (now - state.lastAt < 350) throw new Error('Take a breath before your next move.');
  if (action.type === 'rep') {
    const exercise = EXERCISES[action.exercise];
    if (!exercise || (!preview && !state.assigned.includes(action.exercise)) || state.reps[action.exercise] >= exercise.reps) throw new Error('Exercise already completed.');
    state.reps[action.exercise]++;
    state.repTimes[action.exercise] = now;
    if (state.reps[action.exercise] === exercise.reps) state.strength += exercise.gain;
  } else {
    if (!['battle', 'machine'].includes(action.mode) || !Number.isFinite(action.pull) || action.pull < 0 || action.pull > 1 || !Number.isFinite(action.aim) || Math.abs(action.aim) > 1 || !Number.isFinite(action.aimY ?? 0) || Math.abs(action.aimY ?? 0) > 1) throw new Error('Invalid strike.');
    const hit = strikeDamage(state.strength, action.pull, action.aim, action.aimY);
    state.hits++;
    if (action.mode === 'machine') state.best = Math.max(state.best, hit * 10);
    else {
      state.hp = Math.max(0, state.hp - hit);
      if (state.hp === 0) { state.wins++; state.stage++; state.hp = health(state.stage); }
    }
  }
  state.lastAt = now;
  return state;
}
