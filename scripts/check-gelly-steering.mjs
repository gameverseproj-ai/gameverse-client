import assert from 'node:assert/strict';
import { build } from 'esbuild';
const compiled = await build({stdin:{contents:`
export { GellyInputController } from './src/app/features/world/gelly-input.controller';
export { GellyPlayerController } from './src/app/features/world/gelly-player.controller';
export * as THREE from 'three';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {GellyInputController,GellyPlayerController,THREE}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const listeners = new Map();
globalThis.window={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
const input=new GellyInputController(()=>{});
input.setJoystick(.03,-.9);
assert.equal(input.getMovement().x,0,'Finger drift while walking must not turn the hero');
input.setJoystick(.5,-.9);
assert.ok(input.getMovement().x > .47 && input.getMovement().x < .49,'Half stick responds linearly without a delayed steep ramp');
input.setJoystick(.10,-.10);
assert.ok(input.getMovement().x>.06 && input.getMovement().z<-.06,'Small corrections respond immediately');
input.setJoystick(1,-1);
assert.deepEqual(input.getMovement(),{x:1,z:-1});
input.setJoystick(0,0);
for(const code of ['KeyW','KeyD'])listeners.get('keydown')({code});
assert.deepEqual(input.getMovement(),{x:1,z:-1},'Steering must not reduce forward throttle');
listeners.get('keydown')({code:'ShiftLeft'});
assert.deepEqual(input.getMovement(),{x:1,z:-1.6},'Sprint must not amplify steering');
listeners.get('blur')();assert.deepEqual(input.getMovement(),{x:0,z:0});
input.destroy();
function makePlayer(){return new GellyPlayerController(new THREE.Scene(),{mesh:new THREE.Group(),spawnY:0,build(){},update(){},destroy(){}});}
for(const fps of [30,60,120]){
 const p=makePlayer();
 p.update(1/fps,{x:1,z:0});
 assert.ok(Math.abs(Math.PI-p.heading-.85/fps)<1e-12,'Turning responds fully on the first frame');
 for(let i=1;i<fps;i++)p.update(1/fps,{x:1,z:0});
 const turned=Math.PI-p.heading;
 assert.ok(Math.abs(turned-.85)<1e-12,'Keep the reduced turn speed');
 const before=p.heading;
 for(let i=0;i<fps/2;i++)p.update(1/fps,{x:0,z:0});
 assert.equal(p.heading,before,'Releasing steering stops rotation immediately');
 p.update(1/fps,{x:-1,z:0});
 assert.ok(p.heading>before,'Reversing steering responds on the next frame');
 const walker=makePlayer();
 for(let i=0;i<fps;i++)walker.update(1/fps,{x:0,z:-1});
 const stoppedAt=walker.position.clone();
 for(let i=0;i<fps;i++)walker.update(1/fps,{x:0,z:0});
 assert.ok(walker.position.equals(stoppedAt),'Releasing movement stops without any drift');
 walker.update(1/fps,{x:0,z:1});
 assert.ok(walker.position.z>stoppedAt.z,'Reversing movement responds immediately');
}
console.log('PASS: joystick dead zone and fine steering, independent throttle, sprint steering, immediate turns and zero-drift stopping at 30/60/120 FPS.');
