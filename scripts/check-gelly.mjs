import assert from 'node:assert/strict';
import { build } from 'esbuild';
import fs from 'node:fs';
const compiled=await build({entryPoints:['src/app/features/world/gelly/gelly-hero.renderer.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {GellyHeroRenderer}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
// Use a minimal scene parent: the hero itself owns real Three.js objects.
const scene={add(){}};
const hero=new GellyHeroRenderer();hero.build(scene);
const rig=hero.mesh.children[0];
hero.playAction('jump');let peak=0;
for(let i=0;i<90;i++){hero.update(1/60,{x:0,z:0},i/60);peak=Math.max(peak,rig.position.y);assert.ok(rig.position.y>=0);}
assert.ok(peak>2.5,'Jump should visibly leave ground');
assert.equal(rig.position.y,0,'Jump should return to ground');
hero.playAction('wave');hero.update(1/60,{x:0,z:0},2);
const torso=rig.children[0];assert.ok(torso.children.some(o=>o.rotation.z < -1),'Wave should raise an arm');
for(let i=0;i<180;i++)hero.update(1/60,{x:1,z:0},3+i/60);
assert.ok(Math.abs(hero.mesh.rotation.y-Math.PI/2)<.001,'Hero turns toward travel');
for(const rate of [30,60,120]){for(let i=0;i<rate;i++)hero.update(1/rate,{x:0,z:1},7+i/rate);assert.ok(Number.isFinite(rig.position.y));}
hero.destroy();
const models=fs.readdirSync('public/assets/gelly',{withFileTypes:true}).filter(file=>file.isFile()&&file.name.endsWith('.glb'));
assert.equal(models.length,8,'All eight world models must be checked');
for(const {name:file} of models){
 const b=fs.readFileSync(`public/assets/gelly/${file}`);assert.equal(b.readUInt32LE(8),b.length);
 const doc=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.ok(doc.accessors[2].count/3<=24000,`${file} exceeds triangle budget`);
 assert.ok(b.length<650000,`${file} exceeds download budget`);
}
console.log('PASS: jump arc and landing, wave pose, directional turning, 30/60/120 Hz stability, and all eight GLB budgets.');
