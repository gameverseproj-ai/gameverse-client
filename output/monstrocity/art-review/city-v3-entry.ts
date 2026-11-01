import * as T from 'three';
import { MonstrocityScene } from '../../../src/app/features/games/monstrocity/monstrocity.scene';
import { LocalMonstrocityApi } from '../../../src/app/features/games/monstrocity/monstrocity-local.api';
import { mapFor,CITY_MAP_VERSION } from '../../../src/app/features/games/monstrocity/monstrocity.map';
const map=mapFor(CITY_MAP_VERSION),canvas=document.querySelector('canvas')!,scene:any=new MonstrocityScene(canvas,map.version);
const api=new LocalMonstrocityApi({getItem:()=>null,setItem:()=>{}},Date.now,()=>0);
const state=await api.create({character:'male',configVersion:api.config.version},crypto.randomUUID());
scene.setCharacter(false);state.run!.combat=null;state.run!.notice=null;state.run!.phase='day';state.run!.nearby=[];
let overview=true,previous=performance.now(),frames=0,total=0;
const overviewCamera=new T.PerspectiveCamera(48,1,.1,450);overviewCamera.position.set(100,145,150);overviewCamera.lookAt(0,0,0);
const select=document.querySelector('select')!;
for(const q of map.districts){const option=document.createElement('option');option.value=q.id;option.textContent=q.name;select.append(option);}
select.addEventListener('change',()=>{const q=map.districts.find(q=>q.id===select.value)!;state.run!.position={x:q.x,z:q.z};scene.setCharacter(false);scene.setCameraMode('follow');overview=false;});
document.querySelector('#overview')!.addEventListener('click',()=>overview=true);
document.querySelector('#walk')!.addEventListener('click',()=>{scene.setCameraMode('follow');overview=false;});
function render(now:number){const dt=Math.min(.05,(now-previous)/1000);previous=now;scene.resize(canvas.clientWidth,canvas.clientHeight);state.run!.activeElapsedMs+=dt*1000;scene.render(state,dt,false);if(overview){overviewCamera.aspect=canvas.clientWidth/canvas.clientHeight;overviewCamera.updateProjectionMatrix();scene.renderer.render(scene.world,overviewCamera);}frames++;total+=dt;if(total>1){document.querySelector('#stats')!.textContent=`${map.version} · 25 кварталов · 154 × 154 м · ${scene.renderer.info.render.calls} вызовов отрисовки`;frames=0;total=0;}requestAnimationFrame(render)}requestAnimationFrame(render);
