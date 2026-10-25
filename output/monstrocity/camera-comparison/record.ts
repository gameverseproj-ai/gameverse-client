import * as T from 'three';
import { MonstrocityScene } from '../../../src/app/features/games/monstrocity/monstrocity.scene';
import { LocalMonstrocityApi } from '../../../src/app/features/games/monstrocity/monstrocity-local.api';
const W=960,H=640,FPS=30,DURATION=20;
const api=new LocalMonstrocityApi({getItem:()=>null,setItem:()=>{}},()=>100000,()=>0);
const initial=await api.create({character:'male',configVersion:api.config.version},crypto.randomUUID());
const scenes=[0,1].map(i=>{
 const source=document.createElement('canvas');source.width=W;source.height=H;
 const scene:any=new MonstrocityScene(source);scene.resize(W,H);scene.renderer.setPixelRatio(1);
 const output=document.getElementById(i?'b':'a') as HTMLCanvasElement;output.width=W;output.height=H;
 const camera=new T.PerspectiveCamera(48,W/H,.1,150);const follow=new T.Vector3();
 return {scene,source,output,camera,follow,state:structuredClone(initial),initialized:false};
});
const points=[[-7,-4.6],[-7,-1.8],[-3,-1.8],[-3,-4.6],[-7,-4.6]];
function position(t:number){const phase=Math.min(3.9999,Math.max(0,(t-1)/4));const i=Math.floor(phase),u=phase-i;return {x:points[i][0]+(points[i+1][0]-points[i][0])*u,z:points[i][1]+(points[i+1][1]-points[i][1])*u};}
function draw(time:number){
 scenes.forEach((v,index)=>{
  const r=v.state.run!;r.position=position(time);r.combat=null;r.notice=null;r.phase='day';r.fogRemainingActiveMs=0;
  r.nearby=[{id:'crate-start',kind:'container',state:'available',position:{x:-7,z:-5.8}}];r.search=time>=17?{targetId:'crate-start',remainingActiveMs:2000}:null;
  v.scene.render(v.state,1/FPS,false);
  if(index===1){
   const p=v.scene.player.position as T.Vector3,angle=v.scene.player.rotation.y;
   const desired=new T.Vector3(p.x-Math.sin(angle)*5.2,p.y+1+5.2*Math.sqrt(3),p.z-Math.cos(angle)*5.2);
   if(!v.initialized){v.follow.copy(desired);v.initialized=true;}else v.follow.lerp(desired,.08);
   const focus=new T.Vector3(p.x,p.y+1,p.z),direction=v.follow.clone().sub(focus),distance=direction.length();
   const ray=new T.Raycaster(focus,direction.normalize(),.2,distance);
   const obstacles=v.scene.world.children.filter((o:any)=>o instanceof T.Mesh);
   const hit=ray.intersectObjects(obstacles,false)[0];
   v.camera.position.copy(hit?focus.clone().addScaledVector(direction,Math.max(1.5,hit.distance-.45)):v.follow);
   v.camera.lookAt(focus);
   v.scene.renderer.render(v.scene.world,v.camera);
  }
  const ctx=v.output.getContext('2d')!;ctx.drawImage(v.source,0,0,W,H);
  ctx.fillStyle='#10271eea';ctx.fillRect(0,0,W,66);ctx.fillStyle='#ffebc1';ctx.font='600 25px sans-serif';
  ctx.fillText(index?'Б · Позади и выше героя, около 60°':'А · Текущая камера сверху',24,30);
  ctx.font='16px sans-serif';ctx.fillStyle='#cfdbca';ctx.fillText('Один маршрут · одинаковый город · прототип сравнения камер',24,54);
 });
}
for(let i=0;i<10;i++)draw(0);
const preview=setInterval(()=>draw(0),150);
document.querySelector('#status')!.textContent='Готово к записи';
document.querySelector('button')!.addEventListener('click',async()=>{
 clearInterval(preview);
 const button=document.querySelector('button')!;button.disabled=true;
 // Assets are loaded before the user starts recording.
 const chunks:BlobPart[][]=[[],[]];const streams=scenes.map(v=>v.output.captureStream(FPS));
 const type=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';
 const recorders=streams.map((stream,i)=>{const recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:4500000});recorder.ondataavailable=e=>{if(e.data.size)chunks[i].push(e.data)};return recorder});
 const done=recorders.map((recorder,i)=>new Promise<void>(resolve=>{recorder.onstop=async()=>{await fetch(i?'camera-b.webm':'camera-a.webm',{method:'POST',body:new Blob(chunks[i],{type})});streams[i].getTracks().forEach(t=>t.stop());resolve()}}));
 recorders.forEach(r=>r.start());let frame=0;
 const timer=setInterval(()=>{draw(frame/FPS);frame++;document.querySelector('#status')!.textContent=`Запись: ${Math.min(20,Math.floor(frame/FPS))} / 20 секунд`;
 if(frame>=FPS*DURATION){clearInterval(timer);recorders.forEach(r=>r.stop());Promise.all(done).then(()=>document.querySelector('#status')!.textContent='Оба видео сохранены');}},1000/FPS);
});
