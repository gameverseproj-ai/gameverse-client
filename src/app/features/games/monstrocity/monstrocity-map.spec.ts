import { blocked, mapFor, CITY_MAP_VERSION, movePoint, indoorContainerIds } from './monstrocity.map';
describe('Monstrocity expanded city',()=>{
 const city=mapFor(CITY_MAP_VERSION);
 it('preserves the old authoritative boundary while expanding the new version',()=>{
  expect(blocked({x:20,z:20})).toBeTrue();expect(blocked({x:20,z:20},city)).toBeFalse();
  expect(blocked({x:68,z:0},city)).toBeTrue();
  expect(city.extent*city.extent/(17*17)).toBeGreaterThan(15);
 });
 it('has unique interaction IDs and buildings entirely inside the bounds',()=>{
  const ids=[...city.containers,...city.residents,...city.buildings].map(x=>x.id);
  expect(new Set(ids).size).toBe(ids.length);
  for(const b of city.buildings){expect(Math.abs(b.x)+b.w/2).toBeLessThan(city.extent);expect(Math.abs(b.z)+b.d/2).toBeLessThan(city.extent);}
 });
 it('connects every shelter and supply cache to the original courtyard',()=>{
  const queue=[{x:-6,z:-6}],seen=new Set(['-6,-6']);
  for(let i=0;i<queue.length;i++)for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const p=queue[i],n=movePoint(p,dx,dz,city),key=n.x+','+n.z;
   if(!seen.has(key)){seen.add(key);queue.push(n);}
  }
  for(const target of [...city.shelters,...city.containers,...city.residents]){
   expect(queue.some(p=>Math.hypot(p.x-target.x,p.z-target.z)<1.6)).withContext(JSON.stringify(target)).toBeTrue();
  }
 });
 it('opens only selected houses and places a reachable collectible in every interior',()=>{
  const interiors=city.buildings.filter(b=>b.interior),guaranteed=indoorContainerIds(city);
  expect(interiors.length).toBeGreaterThan(8);expect(interiors.length).toBeLessThan(city.buildings.length/2);
  for(const b of interiors){
   expect(city.containers.some(c=>guaranteed.includes(c.id)&&Math.abs(c.x-b.x)<b.w/2&&Math.abs(c.z-b.z)<b.d/2)).withContext(b.id).toBeTrue();
   expect(blocked({x:b.x,z:b.z-b.d/2},city)).withContext(b.id+' door').toBeFalse();
   expect(blocked({x:b.x-b.w/2,z:b.z},city)).withContext(b.id+' wall').toBeTrue();
  }
 });

});
