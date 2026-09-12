import assert from 'node:assert/strict';
import { build } from 'esbuild';
const compiled=await build({stdin:{contents:`
import '@angular/compiler';
export {signal} from '@angular/core';
export {GellyWorldComponent} from './src/app/features/world/gelly-world.component';
export {GellyJoystickController} from './src/app/features/world/gelly-joystick.controller';
export {GellyCameraController} from './src/app/features/world/gelly-camera.controller';
export * as THREE from 'three';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {signal,GellyWorldComponent,GellyJoystickController,GellyCameraController,THREE}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const world=Object.create(GellyWorldComponent.prototype);
let movement=[0,0],stick,orbits=[];
Object.assign(world,{enteringPortal:signal(null),mobileControls:signal(false),movementPointer:null,cameraPointer:null,
 scene:{orbitCamera:(...args)=>orbits.push(args)},
 joystick:new GellyJoystickController(s=>stick=s,(x,z)=>movement=[x,z])});
const captures=new Set();
const surface={getBoundingClientRect:()=>({left:0,top:0,height:800}),setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id)};
const event=(id,x,y,type='touch')=>({pointerId:id,clientX:x,clientY:y,pointerType:type,currentTarget:surface,target:{closest:()=>false},preventDefault(){}});
world.onPointerDown(event(1,88,600,'mouse'));
assert.equal(world.movementPointer,null,'Mouse cannot drive a mobile joystick');
world.onPointerDown(event(1,88,600));
assert.ok(movement[1]<0,'Fixed stick responds on touch-down');
assert.equal(stick.originX,88);assert.equal(stick.originY,630);
world.onPointerDown(event(2,300,400));world.onPointerMove(event(2,320,410));
assert.deepEqual(orbits,[[20,10]],'Second finger controls only the camera');
assert.ok(movement[1]<0,'Looking does not stop walking');
world.onPointerMove(event(1,88,200));
assert.equal(stick.originY,630,'Mobile stick never relocates');
world.onPointerEnd(event(2,320,410));assert.ok(movement[1]<0);
world.onPointerEnd(event(1,88,200));assert.deepEqual(movement,[0,0]);
world.onPointerDown(event(3,300,400));world.resetJoystick();world.onPointerMove(event(3,350,400));
assert.equal(orbits.length,1,'Blur/reset cancels camera drag');
const camera=new GellyCameraController(1),position=new THREE.Vector3();camera.init(position,Math.PI);
const before=camera.camera.position.clone();camera.orbit(80,40);
for(let i=0;i<120;i++)camera.update(position,Math.PI,position,1/60);
assert.ok(camera.camera.position.distanceTo(before)>1,'Touch orbit moves the camera around a stationary hero');
assert.ok(position.equals(new THREE.Vector3()),'Looking never moves the hero');
console.log('PASS: keyboard-only mouse mode, fixed mobile stick, simultaneous independent camera gestures, pointer release/reset and camera orbit.');
