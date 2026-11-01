import { Point } from './monstrocity.types';
export interface Building {
    id: string;
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    color: number;
    interior?: boolean;
}
export const BUILDINGS: Building[] = [
    { id: 'bakery', x: -10, z: -11, w: 7, d: 6, h: 7, color: 0xbfa180 },
    { id: 'home', x: 0, z: -12, w: 7, d: 5, h: 8, color: 0xc7b59a },
    { id: 'workshop', x: 10, z: -11, w: 7, d: 6, h: 6, color: 0xa88c76 },
    { id: 'library', x: -12, z: 0, w: 5, d: 8, h: 6, color: 0xc0b29c },
    { id: 'house-east', x: 12, z: 0, w: 5, d: 8, h: 8, color: 0xaaa28b },
    { id: 'room', x: -10, z: 11, w: 7, d: 6, h: 5, color: 0xb99c7d, interior: true },
    { id: 'house-south', x: 1, z: 13, w: 7, d: 4, h: 7, color: 0xc1ad8a },
    { id: 'atelier', x: 11, z: 11, w: 6, d: 6, h: 5.5, color: 0xb5a38e },
];
export const SHELTER_CANDIDATES = [{ x: -9, z: -6.8 }, { x: 0, z: -8.2 }, { x: 10, z: -6.8 }, { x: -10, z: 11 }, { x: 11, z: 6.8 }];
export const CONTAINERS = [{ id: 'crate-start', x: -7, z: -5.8 }, { id: 'pantry', x: -9, z: 11 }, { id: 'crate-east', x: 8, z: -5.5 }, { id: 'crate-south', x: 7, z: 7 }, { id: 'crate-west', x: -8, z: 3 }, { id: 'cabinet', x: 2, z: -8 }];
export const RESIDENTS = [{ id: 'gardener', x: 3, z: 3 }, { id: 'keeper', x: -5, z: -6 }];
export interface District {id:string;name:string;x:number;z:number;park?:boolean}
export const DISTRICTS: District[] = [
 {id:'old-town',name:'Old town',x:0,z:0},
 {id:'market',name:'Market quarter',x:-42,z:0},
 {id:'workshops',name:'Workshop quarter',x:42,z:0},
 {id:'gardens',name:'City gardens',x:42,z:-42,park:true},
 {id:'station',name:'Station quarter',x:-42,z:42},
 {id:'library-quarter',name:'Library quarter',x:0,z:-42},
 {id:'canal',name:'Canal quarter',x:0,z:42},
 {id:'north-gate',name:'North gate',x:-42,z:-42},
 {id:'south-gate',name:'South gate',x:42,z:42},
];
const cityBuildings:Building[]=[...BUILDINGS];
const cityContainers=[...CONTAINERS],cityResidents=[...RESIDENTS],cityShelters=[...SHELTER_CANDIDATES];
for(const [index,q] of DISTRICTS.slice(1).entries()){
 const palette=[0xbca98b,0xaab3a0,0xb7a697,0xc2b394];
 for(const [i,[dx,dz]] of [[-11,-11],[11,-11],[-11,11],[11,11]].entries()){
  if(q.park && i>1)continue;
  cityBuildings.push({id:'city-'+q.id+'-'+i,x:q.x+dx,z:q.z+dz,w:8+(index%3),d:7+(i%2)*2,h:4.8+((index+i)%3)*1.2,color:palette[(index+i)%4],interior:i===0 || (index%3===1 && i===3)});
 }
 for(const [i,[dx,dz]] of [[-5,-3],[5,4],[-4,7],[6,-5]].entries())cityContainers.push({id:q.id+'-cache-'+i,x:q.x+dx,z:q.z+dz});
 cityResidents.push({id:q.id+'-resident',x:q.x-2,z:q.z+1});
 cityShelters.push({x:q.x+2,z:q.z+5});
}
for(const b of cityBuildings)if(b.interior && b.id!=='room')cityContainers.push({id:b.id+'-cupboard',x:b.x+1,z:b.z-1});
/** Preserve both older geometries: authoritative runs pin a map version. */
export const CITY_MAP_VERSION='city-v3';
const outerNames=[['northwest','North gardens'],['north','Water tower'],['northeast','Watch post'],['west','West gate'],['east','Eastern promenade'],['southwest','Orchards'],['south','Southern market'],['southeast','Mill quarter'],['foundry','Foundry'],['hospital','Hospital quarter'],['greenhouses','Greenhouses'],['stoneworkers','Stoneworkers'],['residential','Residential lanes'],['civic','Civic square'],['station-old','Old station'],['canal-banks','Canal banks']];
const fullDistricts:District[]=[DISTRICTS[0]];
// The inner ring keeps the established neighbourhood names, now linked by shorter streets.
for(const q of DISTRICTS.slice(1))fullDistricts.push({...q,x:q.x/42*30,z:q.z/42*30});
let outerIndex=0;
for(const z of [-60,-30,0,30,60])for(const x of [-60,-30,0,30,60]){
 if(Math.abs(x)<60 && Math.abs(z)<60)continue;
 const [id,name]=outerNames[outerIndex++];fullDistricts.push({id,name,x,z,park:['northwest','southwest','greenhouses'].includes(id)});
}
const fullBuildings:Building[]=[...BUILDINGS];
const fullContainers=[...CONTAINERS],fullResidents=[...RESIDENTS],fullShelters=[...SHELTER_CANDIDATES];
for(const [index,q] of fullDistricts.slice(1).entries()){
 const palette=[0xb5a18c,0xc2b496,0xa4ad9c,0xb9a392,0xa5b2b0,0xc0ae91];
 for(const [i,[dx,dz]] of [[-8,-8],[8,-8],[-8,8],[8,8]].entries()){
  if(q.park && i>=2)continue;
  fullBuildings.push({id:'city3-'+q.id+'-'+i,x:q.x+dx,z:q.z+dz,w:6+(index+i)%2,d:6+(index%2),h:4.5+(index+i)%4*.9,color:palette[(index+i)%palette.length],interior:i===0 || (index%4===1 && i===3)});
 }
 for(const [i,[dx,dz]] of [[-3,-2],[3,3],[-3,5],[4,-4]].entries())fullContainers.push({id:'city3-'+q.id+'-cache-'+i,x:q.x+dx,z:q.z+dz});
 fullResidents.push({id:'city3-'+q.id+'-resident',x:q.x-1,z:q.z});
 fullShelters.push({x:q.x+1.5,z:q.z+3});
}
for(const b of fullBuildings)if(b.interior && b.id!=='room')fullContainers.push({id:b.id+'-cupboard',x:b.x+1,z:b.z-1});
const roadsFor=(extent:number)=>extent===77?[-75,-45,-16.5,16.5,45,75]:extent===67?[-63,-21,21,63]:[];
const MAPS={
 'courtyard-v1':{version:'courtyard-v1',extent:17,buildings:BUILDINGS,containers:CONTAINERS,residents:RESIDENTS,shelters:SHELTER_CANDIDATES,districts:DISTRICTS.slice(0,1),roads:roadsFor(17)},
 'city-v2':{version:'city-v2',extent:67,buildings:cityBuildings,containers:cityContainers,residents:cityResidents,shelters:cityShelters,districts:DISTRICTS,roads:roadsFor(67)},
 'city-v3':{version:'city-v3',extent:77,buildings:fullBuildings,containers:fullContainers,residents:fullResidents,shelters:fullShelters,districts:fullDistricts,roads:roadsFor(77)},
};
export function mapFor(version='courtyard-v1'){
 return MAPS[version as keyof typeof MAPS] ?? MAPS['courtyard-v1'];
}
export function indoorContainerIds(map:ReturnType<typeof mapFor>){return map.containers.filter(c=>map.buildings.some(b=>b.interior && Math.abs(c.x-b.x)<b.w/2 && Math.abs(c.z-b.z)<b.d/2)).map(c=>c.id);}
export type CityMap=ReturnType<typeof mapFor>;
export function blocked(p: Point, map=mapFor()): boolean {
    if (Math.abs(p.x) > map.extent || Math.abs(p.z) > map.extent)
        return true;
    for (const b of map.buildings) {
        if (b.interior) {
            // Front doorway is 2 units wide; room is accessible and shares the scene geometry.
            const dx = p.x - b.x, dz = p.z - b.z;
            if (Math.abs(dx) < b.w / 2 + .25 && Math.abs(dz) < b.d / 2 + .25) {
                if (Math.abs(dx) > b.w / 2 - .35 || dz > b.d / 2 - .35)
                    return true;
                if (dz < -b.d / 2 + .35 && Math.abs(dx) > 1)
                    return true;
            }
        }
        else if (Math.abs(p.x - b.x) < b.w / 2 + .28 && Math.abs(p.z - b.z) < b.d / 2 + .28)
            return true;
    }
    if (map.containers.some(c => distance(c, p) < .5))
        return true;
    if (Math.abs(p.x - 15) < 1.35 && Math.abs(p.z + 7) < 2.85)
        return true;
    for (const [x, z] of [[-5, 1], [5, 1], [-4, 6], [7, -4]])
        if (Math.abs(p.x - x) < 1.1 && Math.abs(p.z - z) < 1.1)
            return true;
    return Math.hypot(p.x, p.z) < 1.5; // planted fountain island
}
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
export function movePoint(p: Point, x: number, z: number, map=mapFor()): Point {
    const next = { ...p };
    if (!blocked({ x: p.x + x, z: p.z },map))
        next.x += x;
    if (!blocked({ x: next.x, z: p.z + z },map))
        next.z += z;
    return next;
}
export function lineBlocked(a: Point, b: Point, map=mapFor()): boolean {
    const steps=Math.max(20,Math.ceil(distance(a,b)/.4));
    for (let i = 1; i < steps; i++)
        if (blocked({ x: a.x + (b.x - a.x) * i / steps, z: a.z + (b.z - a.z) * i / steps },map))
            return true;
    return false;
}
