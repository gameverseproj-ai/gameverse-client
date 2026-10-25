import { blocked, mapFor } from './monstrocity.map';
import { residentPose,residentRoute } from './monstrocity-residents';
describe('residents dash between cover',()=>{
 for(const version of ['courtyard-v1','city-v2'])it(`keeps ${version} routes walkable, with running and waiting phases`,()=>{
  const map=mapFor(version);
  for(const person of map.residents){
   const route=residentRoute(person,map);let running=0,waiting=0;
   expect(Math.hypot(route.to.x-route.from.x,route.to.z-route.from.z)).withContext(person.id).toBeGreaterThan(2);
   for(let t=0;t<20;t+=.1){const pose=residentPose(route,t);expect(blocked(pose,map)).withContext(person.id).toBeFalse();pose.running?running++:waiting++;}
   expect(running).toBeGreaterThan(0);expect(waiting).toBeGreaterThan(0);
  }
 });
 it('has a deterministic position for interaction and rendering at the same active time',()=>{
  const map=mapFor('city-v2'),route=residentRoute(map.residents[0],map);
  expect(residentPose(route,17.25)).toEqual(residentPose(route,17.25));
  expect(residentPose(route,0)).not.toEqual(residentPose(route,2));
 });
});
