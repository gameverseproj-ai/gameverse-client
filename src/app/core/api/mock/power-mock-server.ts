import { PowerAction, PowerState } from '../../models/power.model';
import { EXERCISES, dailyExercises } from '../../../features/games/power/power-exercises';
import { REP_TIMEOUT, localDay, strikeDamage, punchZone, DEFAULT_STRIKE_RULES, PowerStrikeRules } from '../../../features/games/power/power-engine';

// Mock server authority: creation, HP balance, save migration and progression.
// Replace this layer with backend endpoints; the UI consumes PowerState only.
/** A new challenger takes ~4 full centered hits initially, ~7 at level 20.
 * Snapshot this at spawn so training never heals an opponent mid-fight. */
export function health(stage: number, strength = 20): number {
  return Math.round(strength * 2.5 * (3.6 + .7 * Math.log2(stage)));
}
export function legacyHealth(stage: number): number { return Math.round(180 * Math.pow(stage, 1.35)); }
export function freshPower(): PowerState { return { strength: 20, stage: 1, hp: health(1), maxHp: health(1), best: 0, hits: 0, wins: 0, day: '', reps: Array(60).fill(0), lastAt: 0, repTimes: Array(60).fill(0), assigned: [] }; }
export function normalizePower(before: PowerState, now: number): PowerState {
  const state = structuredClone(before);
  // Upgrade old saves once, preserving damage already dealt as a health fraction.
  if (state.maxHp === undefined) {
    state.maxHp = health(state.stage, state.strength);
    state.hp = Math.max(1, Math.min(state.maxHp, Math.round(state.hp / legacyHealth(state.stage) * state.maxHp)));
  }
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
export function applyPower(before: PowerState, action: PowerAction, now: number, preview = false, rules: PowerStrikeRules = DEFAULT_STRIKE_RULES, random = Math.random): PowerState {
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
    const hit = strikeDamage(state.strength, action.pull, action.aim, action.aimY, rules, random());
    state.lastStrike = { damage: hit, maxDamage: Math.round(state.strength * 2.5 * rules.maximumPower), points: hit * 10, zone: punchZone(action.aim, action.aimY), mode: action.mode };
    state.hits++;
    if (action.mode === 'machine') state.best = Math.max(state.best, hit * 10);
    else {
      state.hp = Math.max(0, state.hp - hit);
      if (state.hp === 0) {
        state.wins++; state.stage++;
        state.maxHp = Math.max(state.maxHp + 1, health(state.stage, state.strength));
        state.hp = state.maxHp;
      }
    }
  }
  state.lastAt = now;
  return state;
}
