// Shared gesture and presentation helpers. Challenger HP belongs to the mock server.
export { EXERCISES } from './power-exercises';
export const REP_TIMEOUT = 10000;
export type PowerStrikeRules = { minimumPower: number; maximumPower: number; headMultiplier: number; bodyMultiplier: number };
export const DEFAULT_STRIKE_RULES: PowerStrikeRules = { minimumPower: .8, maximumPower: 1, headMultiplier: 1, bodyMultiplier: .65 };
export function validateStrikeRules(rules: PowerStrikeRules): void {
  if (!Object.values(rules).every(Number.isFinite) || rules.minimumPower <= 0 || rules.minimumPower > rules.maximumPower || rules.maximumPower > 1 || rules.headMultiplier !== 1 || rules.bodyMultiplier < 0 || rules.bodyMultiplier >= rules.headMultiplier) throw new Error('Invalid strike configuration');
}
export function accuracy(position: number): number { return Math.max(0, 1 - Math.abs(position - 75) / 75); }
export function damage(strength: number, position: number): number { return Math.round(strength * (0.5 + accuracy(position) * 2)); }
export function localDay(now: number): string { const d = new Date(now); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
export function punchZone(aim:number, aimY=0): 'head' | 'body' | null {
  const x=aim*124,y=aimY*115;
  if ((x/51)**2+((y+67)/58)**2<=1) return 'head';
  if ((x/68)**2+((y-33)/77)**2<=1) return 'body';
  return null;
}
export function strikeDamage(strength: number, pull: number, aim: number, aimY=0, rules = DEFAULT_STRIKE_RULES, sample = 1): number {
  validateStrikeRules(rules);
  const zone = punchZone(aim,aimY);
  if (!zone || pull < .08) return 0;
  // Pull confirms a deliberate strike; the server samples its power once.
  const maximum = Math.round(strength * 2.5 * rules.maximumPower);
  const minimum = Math.ceil(strength * 2.5 * rules.minimumPower);
  const power = minimum + Math.min(maximum - minimum, Math.floor(Math.max(0, Math.min(1, sample)) * (maximum - minimum + 1)));
  return zone === 'head' ? power : Math.min(maximum - 1, Math.floor(power * rules.bodyMultiplier));
}
