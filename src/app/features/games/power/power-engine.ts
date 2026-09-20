// Shared gesture and presentation helpers. Challenger HP belongs to the mock server.
export { EXERCISES } from './power-exercises';
export const REP_TIMEOUT = 10000;
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
