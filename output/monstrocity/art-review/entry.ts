import { MonsterGaitRenderer } from '../../../src/app/features/games/monstrocity/monstrocity-gait';
const actors=['mossback','twigwalker'].map(id=>new MonsterGaitRenderer(document.getElementById(id) as HTMLCanvasElement,id as 'mossback'|'twigwalker'));
let phase=0,playing=true,previous=0;
const label=document.querySelector('#frame')!;
function draw(now:number){if(playing)phase=(phase+Math.min(40,now-previous)/180)%8;previous=now;actors.forEach(a=>a.draw(phase));label.textContent=`Фаза ${Math.floor(phase)+1} / 8 · фиксированный ракурс`;requestAnimationFrame(draw)}requestAnimationFrame(draw);
document.querySelector('#pause')!.addEventListener('click',()=>playing=!playing);
document.querySelector('#next')!.addEventListener('click',()=>{playing=false;phase=(Math.floor(phase)+1)%8;actors.forEach(a=>a.draw(phase));});
document.querySelector('#sheet')!.addEventListener('click',()=>{
 playing=false;const sheet=document.querySelector('#poses') as HTMLCanvasElement,ctx=sheet.getContext('2d')!;ctx.clearRect(0,0,sheet.width,sheet.height);
 actors.forEach((a,row)=>{for(let key=0;key<8;key++){a.draw(key);ctx.drawImage(document.getElementById(row?'twigwalker':'mossback') as HTMLCanvasElement,key*144,row*164,144,144);ctx.fillStyle='#ffeac6';ctx.font='12px system-ui';ctx.fillText(String(key+1),key*144+68,row*164+158);}});
});
