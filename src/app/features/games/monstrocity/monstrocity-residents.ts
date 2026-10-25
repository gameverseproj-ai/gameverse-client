import { blocked, CityMap } from './monstrocity.map';
import { Point } from './monstrocity.types';
export interface ResidentRoute { id:string; from:Point; to:Point; speed:number; waitA:number; waitB:number; offsetSeconds:number }
const routes=new Map<string,ResidentRoute>();
/** Short, collision-free dashes from cover to cover, staggered for each resident. */
export function residentRoute(p:{id:string;x:number;z:number},map:CityMap):ResidentRoute {
 const key=`${map.version}:${p.id}:${p.x}:${p.z}`;
 const cached=routes.get(key);if(cached)return cached;
 let to={x:p.x,z:p.z};
 const hash=Array.from(p.id).reduce((v,c)=>v+c.charCodeAt(0),0);
 const directions=[[1,0],[0,1],[-1,0],[0,-1]];
 for(let n=0;n<4;n++){
  const [x,z]=directions[(n+hash)%4];let length=0;
  for(let d=.2;d<=5.2;d+=.2){if(blocked({x:p.x+x*d,z:p.z+z*d},map))break;length=d;}
  if(length>=2.4){to={x:p.x+x*length,z:p.z+z*length};break;}
 }
 const route={id:p.id,from:{x:p.x,z:p.z},to,speed:2.8,waitA:1.5,waitB:2.3,offsetSeconds:hash*.137};
 routes.set(key,route);return route;
}
export function residentPose(route:ResidentRoute,seconds:number){
 const length=Math.hypot(route.to.x-route.from.x,route.to.z-route.from.z),travel=length/route.speed;
 const period=travel*2+route.waitA+route.waitB;
 const phase=((seconds+route.offsetSeconds)%period+period)%period;
 let progress=0,running=false,direction=1;
 if(phase>=route.waitA && phase<route.waitA+travel){progress=(phase-route.waitA)/travel;running=true;}
 else if(phase>=route.waitA+travel && phase<route.waitA+travel+route.waitB)progress=1;
 else if(phase>=route.waitA+travel+route.waitB){progress=1-(phase-route.waitA-travel-route.waitB)/travel;running=true;direction=-1;}
 progress=progress*progress*(3-2*progress);
 return {x:route.from.x+(route.to.x-route.from.x)*progress,z:route.from.z+(route.to.z-route.from.z)*progress,running,facing:Math.atan2((route.to.x-route.from.x)*direction,(route.to.z-route.from.z)*direction),stride:seconds*13+route.offsetSeconds};
}
