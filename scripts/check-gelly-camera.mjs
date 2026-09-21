import assert from 'node:assert/strict';
import { build } from 'esbuild';
const result = await build({stdin:{contents:`
export { GellyCameraController } from './src/app/features/world/gelly-camera.controller';
export { GellyPlayerController } from './src/app/features/world/gelly-player.controller';
export { GellyHeroRenderer } from './src/app/features/world/gelly/gelly-hero.renderer';
export * as halls from './src/app/features/world/gelly/gelly-halls';
export * as THREE from 'three';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {GellyCameraController,GellyPlayerController,GellyHeroRenderer,halls,THREE} = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const scene = new THREE.Scene(), hero = new GellyHeroRenderer();
const player = new GellyPlayerController(scene,hero);
const camera = new GellyCameraController(16/9);
camera.init(player.position,player.heading,player.eyes);
const initialZ=player.position.z;
for(let i=0;i<60;i++) player.update(1/60,{x:0,z:-1});
assert.ok(player.position.z<initialZ-6,'Forward moves toward the halls');
for(let i=0;i<40;i++) player.update(1/60,{x:1,z:0});
const forward = new THREE.Vector3(Math.sin(player.heading),0,Math.cos(player.heading));
for(let i=0;i<120;i++) camera.update(player.position,player.heading,player.eyes,1/60);
assert.ok(camera.camera.position.clone().sub(player.position).dot(forward)<-8,'Camera settles behind the hero');
const view=camera.camera.quaternion.clone();
camera.update(player.position,player.heading+1,player.eyes,1/60);
const turn=camera.camera.quaternion.angleTo(view);
assert.ok(turn>0&&turn<.02,'Camera starts following immediately, with a bounded turn per frame');
for(let i=0;i<180;i++)camera.update(player.position,player.heading+1,player.eyes,1/60);
const nextForward=new THREE.Vector3(Math.sin(player.heading+1),0,Math.cos(player.heading+1));
assert.ok(camera.camera.position.clone().sub(player.position).dot(nextForward)<-8,'Camera follows a new heading');
for(const fps of [30,60,120]){
 const c=new GellyCameraController(1);const origin=new THREE.Vector3();c.init(origin);
 const before=c.camera.position.clone();
 const moved=new THREE.Vector3(1,0,0);c.update(moved,Math.PI,moved,1/fps);
 assert.ok(c.camera.position.x>0&&c.camera.position.x<.4,'Movement onset is softened');
 for(let i=1;i<fps;i++)c.update(moved,Math.PI,moved,1/fps);
 assert.ok(Math.abs(c.camera.position.x-1)<1e-5,'Camera settles promptly at every frame rate');
}
// Crossing the angle boundary must take the short arc, not orbit around the world.
const wrapped=new GellyCameraController(1),origin=new THREE.Vector3();
wrapped.init(origin,Math.PI-.02);
const initialView=wrapped.camera.quaternion.clone();
wrapped.update(origin,-Math.PI+.02,origin,1/60);
assert.ok(wrapped.camera.quaternion.angleTo(initialView)<.01,'Wraparound stays smooth');
for(let i=0;i<120;i++)wrapped.update(origin,-Math.PI+.02,origin,1/60);
const wrappedForward=new THREE.Vector3(Math.sin(-Math.PI+.02),0,Math.cos(-Math.PI+.02));
assert.ok(wrapped.camera.position.dot(wrappedForward)<-8,'Wraparound settles behind hero');
camera.setMode('first-person'); player.setFirstPerson(true);
camera.update(player.position,player.heading,player.eyes,1/60);
assert.ok(camera.camera.position.distanceTo(player.eyes)<1e-6);
assert.equal(hero.mesh.visible,false);
assert.ok(camera.camera.getWorldDirection(new THREE.Vector3()).dot(forward)>.999,'Eyes look in the hero heading');
player.playAction('jump');for(let i=0;i<25;i++)player.update(1/60,{x:0,z:0});
camera.update(player.position,player.heading,player.eyes,1/60);
assert.ok(player.eyes.y>3,'Eye anchor follows jumping');
assert.ok(camera.camera.position.distanceTo(player.eyes)<1e-6);
player.setFirstPerson(false);assert.equal(hero.mesh.visible,true);
// Label canvas is stubbed; geometry and material validation use real Three.js.
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({clearRect(){},fillText(){}})})};
for(const buildHall of [halls.buildSnakeHall,halls.buildTemple,halls.buildFactory,halls.buildGym]){
 const hall=buildHall();halls.batchHall(hall);hall.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(hall),size=bounds.getSize(new THREE.Vector3());
 assert.ok(size.y>10 && size.y<17);
 const materials=new Set();let draws=0;
 hall.traverse(o=>{if(o.isMesh){draws++;materials.add(o.material.uuid);}});
 assert.ok(materials.size>=8,'Each hall has differentiated materials');
 assert.ok(draws<160,`Hall draw-call budget: ${draws}`);
 console.log(`${buildHall.name}: ${draws} draw calls, ${materials.size} materials, height ${size.y.toFixed(1)}`);
}
console.log('PASS: forward movement, damped following third-person camera, smooth frame-independent follow, first-person eye anchor and orientation, jump follow, hero visibility and hall geometry budgets.');
