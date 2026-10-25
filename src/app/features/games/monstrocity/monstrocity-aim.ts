import { Config, Run } from './monstrocity.types';
/** Beginner aim assist leads a moving target instead of asking a child to estimate flight time. */
export function assistedAim(run:Run,config:Config,latencySeconds=0){
 const b=run.combat!,m=config.monsters.find(m=>m.id===b.monsterId);
 if(!m)return {...b.target};
 const ahead=config.stoneFlightSeconds+Math.max(0,Math.min(.25,latencySeconds));
 const t=b.elapsedActiveMs/1000+ahead;
 const cycle=Object.values(config.phaseSeconds).reduce((a,b)=>a+b,0)*1000;
 const encounterDay=Math.floor((run.activeElapsedMs-b.elapsedActiveMs)/cycle);
 const evading=m.motion==='zigzag' && encounterDay >= (m.motionStartsDay??0);
 const x=evading ? .5+m.motionAmplitude*Math.sin(2*Math.PI*t/m.motionPeriodSeconds):.5;
 const span=run.configVersion==='monstrocity-v1' ? .55 : .2;
 const progress=(seconds:number)=>{
  const period=m.motionPeriodSeconds;
  const moving=m.motion==='stop-start' ? Math.floor(seconds/period)*period+Math.min(seconds%period,period/2)*2 : seconds;
  return Math.min(1,moving/m.approachSeconds);
 };
 return {x:Math.max(0,Math.min(1,x)),y:Math.min(1,b.target.y+span*(progress(t)-progress(b.elapsedActiveMs/1000)))};
}
