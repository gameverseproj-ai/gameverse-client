import assert from 'node:assert/strict';
import {build} from 'esbuild';
const out=await build({entryPoints:['src/app/features/games/power/training-rig.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {makeTrainingRig, DIM}=await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
const close=(a,b,message,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<tolerance,`${message}: ${a} vs ${b}`);
const fingerprints=new Set();
for(let id=0;id<60;id++){
 const samples=[];let previous;
 for(let frame=0;frame<=200;frame++){
  const r=makeTrainingRig(id,frame/200);const points=[r.hip,r.head,...r.hips,...r.shoulders,...r.knees,...r.ankles,...r.elbows,...r.wrists];
  for(const point of points){assert.ok(point.toArray().every(Number.isFinite),`finite ${id}`);assert.ok(point.y>-.001,`floor penetration ${id}: ${point.y}`);}
  for(let i=0;i<2;i++){
   close(r.hips[i].distanceTo(r.knees[i]),DIM.thigh,`thigh ${id}`);close(r.knees[i].distanceTo(r.ankles[i]),DIM.shin,`shin ${id}`);
   close(r.shoulders[i].distanceTo(r.elbows[i]),DIM.upperArm,`upper arm ${id}`);close(r.elbows[i].distanceTo(r.wrists[i]),DIM.forearm,`forearm ${id}`);
  }
  if(r.symmetric)for(const key of ['hips','shoulders','knees','ankles','elbows','wrists']){
   close(r[key][0].x,-r[key][1].x,`mirror x ${id} ${key}`);close(r[key][0].y,r[key][1].y,`mirror y ${id} ${key}`);close(r[key][0].z,r[key][1].z,`mirror z ${id} ${key}`);
  }
  if(previous)points.forEach((point,i)=>assert.ok(point.distanceTo(previous[i])<.15,`frame discontinuity ${id} ${frame}`));
  previous=points;samples.push(points.map(p=>p.toArray()));
 }
 const fingerprint=JSON.stringify(samples);assert.ok(!fingerprints.has(fingerprint),`duplicate ${id}`);fingerprints.add(fingerprint);
 const start=makeTrainingRig(id,0),end=makeTrainingRig(id,1);for(const key of ['hip','head'])assert.ok(start[key].distanceTo(end[key])<1e-6,`loop ${id}`);
}
// Contact and technique regressions, beyond merely connected bones.
for(let f=0;f<=100;f++){
 const p=f/100;
 for(const id of [0,1,12,47,51,52,53,54,55,56,58]){
  const r=makeTrainingRig(id,p),start=makeTrainingRig(id,0);
  for(let i=0;i<2;i++)assert.ok(r.ankles[i].distanceTo(start.ankles[i])<.018,`planted foot slides ${id}`);
 }
 const push=makeTrainingRig(1,p);
 for(let i=0;i<2;i++){
  close(push.wrists[i].y,.10,'push-up palm contact',.002);
  const leg=push.hips[i].clone().sub(push.ankles[i]).normalize(),torso=push.neck.clone().sub(push.hip).normalize();assert.ok(leg.dot(torso)>.999,'push-up straight back');
 }
 const curl=makeTrainingRig(51,p),rest=makeTrainingRig(51,0);for(let i=0;i<2;i++)close(curl.elbows[i].distanceTo(rest.elbows[i]),0,'curl elbow drift');
 const raise=makeTrainingRig(21,p);for(let i=0;i<2;i++)assert.ok(raise.hips[i].distanceTo(raise.ankles[i])>.90,'leg raise knee bend');
}
assert.ok(makeTrainingRig(52,.5).wrists[0].y-makeTrainingRig(52,0).wrists[0].y>.4,'shoulder press range');
console.log('PASS: 60 motions × 201 frames; proportions, bilateral symmetry, continuity, floor bounds, planted feet, push-up alignment, fixed curl elbows, straight leg raises, shoulder press range.');

for(let frame=0;frame<=100;frame++){
 const p=frame/100;
 for(const id of [20,21,22,23,27]){const r=makeTrainingRig(id,p);for(let i=0;i<2;i++)close(r.hips[i].distanceTo(r.ankles[i]),.91,`straight leg ${id}`);}
 for(const id of [16,20,21,22,23]){const r=makeTrainingRig(id,p);for(let i=0;i<2;i++){const shin=r.ankles[i].clone().sub(r.knees[i]).normalize();close(Math.atan2(-shin.y,shin.z),r.footPitch[i],`foot follows shin ${id}`);}}
 const climb=makeTrainingRig(18,p);for(let i=0;i<2;i++){assert.ok(climb.knees[i].y<climb.hips[i].y,'climber knee below hip');close(climb.knees[i].x,climb.hips[i].x,'climber sagittal knee');close(climb.wrists[i].y,.1,'climber hand contact',.002);}
}
for(let rep=0;rep<12;rep++){
 const side=Math.floor(rep/6),r=makeTrainingRig(24,.5,rep);assert.ok(r.ankles[side].y>r.ankles[1-side].y+.08,'six reps per leg');
 const tap=makeTrainingRig(19,.5,rep);assert.ok(tap.wrists[rep%2].y>tap.wrists[1-rep%2].y+.25,'alternate shoulder taps');
 const bug=makeTrainingRig(16,.5,rep);assert.ok(bug.ankles[rep%2].y<bug.ankles[1-rep%2].y-.3,'alternate dead bug leg');assert.ok(bug.wrists[1-rep%2].y<bug.wrists[rep%2].y-.3,'opposite dead bug arm');
}
assert.ok(makeTrainingRig(23,.25).ankles[0].y>makeTrainingRig(23,.25).ankles[1].y);assert.ok(makeTrainingRig(23,.75).ankles[1].y>makeTrainingRig(23,.75).ankles[0].y);
console.log('PASS: floor exercise knee planes, foot alignment, alternating hands/legs, six-plus-six sequence.');
