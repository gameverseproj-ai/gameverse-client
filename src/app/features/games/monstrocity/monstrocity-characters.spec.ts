import * as T from 'three';
import { createExplorer } from './monstrocity-explorer';
import { createCitizen,CITIZEN_STYLES } from './monstrocity-citizen';
describe('Monstrocity character animation rigs',()=>{
 const materials=new Map<number,T.MeshStandardMaterial>();
 const material=(color:number)=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color}));return materials.get(color)!};
 afterAll(()=>materials.forEach(m=>m.dispose()));
 it('keeps four articulated limbs and knee pivots after batching every character',()=>{
  const actors=[createExplorer(false,material),createExplorer(true,material),...CITIZEN_STYLES.map((_,i)=>createCitizen(i,material))];
  for(const actor of actors){
   const limbs=actor.children.filter(c=>c.name==='limb');expect(limbs.length).toBe(4);
   expect(limbs[1].getObjectByName('knee')).toBeDefined();expect(limbs[3].getObjectByName('knee')).toBeDefined();
   limbs.forEach((limb,i)=>{limb.rotation.x=Math.sin(i)*.8;const knee=limb.getObjectByName('knee');if(knee)knee.rotation.x=.7;});
   const bounds=new T.Box3().setFromObject(actor);expect(Number.isFinite(bounds.min.y)).toBeTrue();expect(bounds.max.y).toBeGreaterThan(1.5);expect(bounds.max.y).toBeLessThan(2.5);
   actor.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose()});
  }
 });
 it('assigns each city resident a different civilian identity',()=>{
  const actors=CITIZEN_STYLES.map((_,i)=>createCitizen(i,material));
  expect(new Set(actors.map(a=>a.userData['appearance'])).size).toBe(10);
  expect(actors.every(a=>a.name.startsWith('citizen-'))).toBeTrue();
  for(const actor of actors)actor.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose()});
 });
});
