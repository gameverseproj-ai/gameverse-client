import { MonstrocityMusic } from './monstrocity-music';

describe('Monstrocity battle score',()=>{
 it('renders sustained combat with finite, non-silent, unclipped audio',async()=>{
  const offline=new OfflineAudioContext(2,44100*12,44100);let clock=0;
  const proxy=new Proxy(offline,{get(target,key){
   if(key==='currentTime')return clock;
   if(key==='state')return 'running';
   if(key==='resume'||key==='close')return async()=>{};
   const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
  }});
  spyOn(window,'AudioContext').and.returnValue(proxy as unknown as AudioContext);
  const music:any=new MonstrocityMusic();
  try {
   await music.start(false);clearInterval(music.timer);music.battle=true;
   for(clock=0;clock<11;clock+=.1)music.schedule();
   const buffer=await offline.startRendering();let peak=0;
   for(let ch=0;ch<2;ch++)for(const sample of buffer.getChannelData(ch)){
    if(!Number.isFinite(sample))throw new Error('Non-finite audio sample');peak=Math.max(peak,Math.abs(sample));
   }
   expect(peak).toBeGreaterThan(.01);expect(peak).toBeLessThan(1);
  } finally {music.destroy();}
 },20000);
});
