import assert from 'node:assert/strict';
import { build } from 'esbuild';
const compiled = await build({stdin:{contents:`import '@angular/compiler'; export { PowerSceneComponent } from './src/app/features/games/power/power-scene.component';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {PowerSceneComponent}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const scene=Object.create(PowerSceneComponent.prototype), hits=[];let captured=false;
Object.assign(scene,{mode:'battle',disabled:false,pointer:null,pull:0,aim:0,aimY:0,keyAt:0,width:400,height:400,charge:{emit(){}},grabbed:{emit(){}},punched:{emit:hit=>hits.push(hit)},canvas:()=>({nativeElement:{getBoundingClientRect(){return {left:0,top:0}},focus(){},setPointerCapture(){captured=true},hasPointerCapture(){return captured},releasePointerCapture(){captured=false}}})});
const event=(x,y,id=1)=>({pointerId:id,button:0,clientX:x,clientY:y,preventDefault(){}});
scene.down(event(320,280));scene.move(event(320,400));assert.equal(hits.length,0);assert.equal(scene.pull,1);
scene.up(event(320,400,2));assert.equal(hits.length,0);
scene.up(event(320,400));assert.deepEqual(hits,[{pull:1,aim:0,aimY:0,hand:'right'}]);assert.equal(captured,false);
scene.down(event(320,280));scene.move(event(350,380));scene.cancel();scene.up(event(350,380));assert.equal(hits.length,1);
scene.down(event(320,280));scene.up(event(320,280));assert.equal(hits.length,1);
scene.disabled=true;scene.down(event(320,280));assert.equal(scene.pointer,null);
console.log('PASS: drag charge, release-only strike, pointer identity, capture cleanup, cancellation, tap rejection, disabled guard.');

scene.disabled=false;scene.down(event(80,280));scene.up(event(80,400));assert.equal(hits.at(-1).hand,'left');scene.down(event(320,280));scene.up(event(320,400));assert.equal(hits.at(-1).hand,'right');scene.down(event(200,100));assert.equal(scene.pointer,null);

scene.down(event(80,280));scene.move(event(80,400));scene.move(event(80,345));scene.up(event(80,345));assert.ok(hits.at(-1).aimY<-.5);assert.equal(hits.at(-1).pull,1,'aiming upwards retains power');
scene.down(event(320,280));scene.move(event(320,330));scene.up(event(320,390));assert.ok(hits.at(-1).aimY>.5,'aim below initial target');
const key=code=>({code,repeat:false,preventDefault(){}});
scene.keyDown(key('Space'));scene.keyDown(key('ArrowUp'));assert.equal(scene.aimY,-.08);scene.keyDown(key('ArrowDown'));assert.equal(scene.aimY,0);scene.cancel();
console.log('PASS: left/right glove selection, two-axis pointer and keyboard aim, retained wind-up.');
