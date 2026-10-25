import { MonstrocityScene } from '../../../src/app/features/games/monstrocity/monstrocity.scene';
import { LocalMonstrocityApi } from '../../../src/app/features/games/monstrocity/monstrocity-local.api';
import { mapFor } from '../../../src/app/features/games/monstrocity/monstrocity.map';
const map=mapFor('city-v2'),canvas=document.querySelector('canvas')!,scene=new MonstrocityScene(canvas,map.version);
const api=new LocalMonstrocityApi({getItem:()=>null,setItem:()=>{}},Date.now,()=>0);
const state=await api.create({character:'female',configVersion:api.config.version},crypto.randomUUID());
scene.setCharacter(true);
let running=true,previous=performance.now();
function location(index:number,inside=false){
 const q=map.districts[index],b=map.buildings.find(b=>b.interior && b.id.startsWith('city-'+q.id))??map.buildings.find(b=>b.id==='room')!;
 state.run!.position=inside?{x:b.x,z:b.z-1}:{x:q.x,z:q.z};state.run!.combat=null;state.run!.notice=null;state.run!.phase='day';state.run!.nearby=[];state.run!.search=null;
 scene.setCharacter(true);scene.setCameraMode('follow');
 document.querySelector('#where')!.textContent=inside?'Внутри доступного дома: отдельный тайник, крыша убрана.':q.name+' · квартал за границами первого двора';
}
location(5);
for(const [index,q] of map.districts.entries()){
 const button=document.createElement('button');button.textContent=q.name;button.onclick=()=>location(index);document.querySelector('#districts')!.append(button);
}
document.querySelector('#inside')!.addEventListener('click',()=>location(5,true));
document.querySelector('#outside')!.addEventListener('click',()=>location(5));
document.querySelector('#pause')!.addEventListener('click',()=>running=!running);
function render(now:number){const dt=Math.min(.05,(now-previous)/1000);previous=now;scene.resize(canvas.clientWidth,canvas.clientHeight);if(running)state.run!.activeElapsedMs+=dt*1000;scene.render(state,dt,!running);requestAnimationFrame(render)}requestAnimationFrame(render);
