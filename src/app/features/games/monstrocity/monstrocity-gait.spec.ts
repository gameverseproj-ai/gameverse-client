import { deformVertex, gaitPose } from './monstrocity-gait';

describe('Monstrocity fixed-view gait',()=>{
 it('keeps the face and torso heading fixed throughout the stride',()=>{
  for(const art of ['mossback','twigwalker'] as const){
   const center=art==='mossback'?.565:.45;
   for(let phase=0;phase<8;phase+=.125){
    for(const y of [.15,.25,.38]){
     const left=deformVertex(center-.06,y,art,phase),right=deformVertex(center+.06,y,art,phase);
     expect(left[0]).toBeCloseTo(center-.06,8);expect(right[0]).toBeCloseTo(center+.06,8);
     expect(right[1]-left[1]).toBeCloseTo(0,8);
    }
   }
  }
 });
 it('alternates the two legs half a cycle apart, with eight distinct key poses',()=>{
  const keys=Array.from({length:8},(_,i)=>gaitPose(i));
  expect(new Set(keys.map(p=>JSON.stringify(p.right))).size).toBe(8);
  keys.forEach((p,i)=>expect(p.left).toEqual(gaitPose(i+4).right));
  expect(keys.slice(0,4).every(p=>p.right.lift===0)).toBeTrue();
  expect(keys.slice(5).every(p=>p.right.lift>0)).toBeTrue();
 });
 it('joins the last frame to the first without a jump',()=>{
  for(const art of ['mossback','twigwalker'] as const)for(const x of [.3,.45,.55,.7]){
   const a=deformVertex(x,.9,art,7.9999),b=deformVertex(x,.9,art,0);
   expect(Math.hypot(a[0]-b[0],a[1]-b[1])).toBeLessThan(.0001);
  }
 });
});
