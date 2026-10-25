import { assistedAim } from './monstrocity-aim';

describe('beginner target prediction', () => {
 const config:any={stoneFlightSeconds:.45,phaseSeconds:{day:240,night:240,dawn:120,dusk:120},monsters:[{id:'twig',motion:'zigzag',motionAmplitude:.22,motionPeriodSeconds:3,approachSeconds:20}]};
 const run=(elapsed=1000):any=>({configVersion:'monstrocity-v2',activeElapsedMs:elapsed,combat:{monsterId:'twig',elapsedActiveMs:elapsed,target:{x:.5,y:.45+.2*elapsed/20000}}});
 it('leads the target at impact instead of using its current location',()=>{
  const aim=assistedAim(run(),config);
  expect(aim.x).toBeCloseTo(.5+.22*Math.sin(2*Math.PI*1.45/3),8);
  expect(aim.y).toBeCloseTo(.45+.2*1.45/20,8);
 });
 it('respects a server-configured day threshold and pins it to encounter start',()=>{
  const gated=structuredClone(config);gated.monsters[0].motionStartsDay=30;
  const early=run();early.activeElapsedMs=30*720000+500;
  expect(assistedAim(early,gated).x).toBe(.5);
  early.activeElapsedMs=30*720000+1000;
  expect(assistedAim(early,gated).x).not.toBe(.5);
 });
 it('bounds latency compensation and does not advance past the end of approach',()=>{
  expect(assistedAim(run(),config,10)).toEqual(assistedAim(run(),config,.25));
  expect(assistedAim(run(20000),config).y).toBeCloseTo(.65,8);
 });
});
