import { Vector3, Quaternion } from 'three';
export const v=(x=0,y=0,z=0)=>new Vector3(x,y,z);
export const DIM={thigh:.45,shin:.46,upperArm:.30,forearm:.29,torso:.52};
export type TrainingRig = { hip:Vector3; pitch:number; roll:number; yaw:number; ankles:Vector3[]; wrists:Vector3[]; knees:Vector3[]; elbows:Vector3[]; hips:Vector3[]; shoulders:Vector3[]; neck:Vector3; head:Vector3; rotation:Quaternion; prop:string; footPitch:number[]; seconds:number; symmetric:boolean };
export function smooth(t:number):number{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
function track(t:number,keys:number[][]):number{for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){const [a,x]=keys[i-1],[b,y]=keys[i];return x+(y-x)*smooth((t-a)/(b-a));}return keys.at(-1)![1];}
/** Solve in an anatomical bending plane. Endpoints remain attached, with no sign-flipping. */
export function chain(root:Vector3,target:Vector3,pole:Vector3,a:number,b:number):[Vector3,Vector3]{
 const axis=target.clone().sub(root),raw=axis.length();axis.normalize();if(raw<1e-8)axis.set(0,-1,0);
 const distance=Math.max(Math.abs(a-b)+.0001,Math.min(a+b-.0001,raw));
 const along=(a*a+distance*distance-b*b)/(2*distance),height=Math.sqrt(Math.max(0,a*a-along*along));
 const normal=pole.clone().sub(axis.clone().multiplyScalar(pole.dot(axis)));if(normal.length()<1e-5)normal.copy(v(1,0,0).cross(axis));normal.normalize();
 return [root.clone().addScaledVector(axis,along).addScaledVector(normal,height),root.clone().addScaledVector(axis,distance)];
}
export function exerciseSeconds(id:number):number{return [6,4,5,42,45,46].includes(id)?1.2:[3,29,30,31,32,33].includes(id)?1.4:[27,28].includes(id)?3:1.8;}
export function makeTrainingRig(id:number,phase:number,repetition=0):TrainingRig{
 const p=Math.max(0,Math.min(1,phase));
 const t=track(p,[[0,0],[.12,0],[.47,1],[.57,1],[.93,0],[1,0]]);
 const alternate=Math.sin(2*Math.PI*p),left=Math.max(0,alternate),right=Math.max(0,-alternate);
 const r:TrainingRig={hip:v(0,1,0),pitch:0,roll:0,yaw:0,ankles:[v(-.15,.11,0),v(.15,.11,0)],wrists:[],knees:[],elbows:[],hips:[],shoulders:[],neck:v(),head:v(),rotation:new Quaternion(),prop:'none',footPitch:[0,0],seconds:exerciseSeconds(id),symmetric:true};
 let armAngles=[[.08,0,.12],[.08,0,.12]]; // abduction, forward flexion, elbow bend
 let targets:Vector3[]|undefined;
 let armPoles=[v(-1,0,-.6),v(1,0,-.6)];
 let legPoles=[v(0,0,1),v(0,0,1)];
 const both=(abd:number,flex:number,bend=.12)=>armAngles=[[abd,flex,bend],[abd,flex,bend]];
 const weights=()=>r.prop='dumbbells';
 const squat=(amount:number)=>{r.hip.set(0,1-.38*amount,-.27*amount);r.pitch=.38*amount;r.ankles=[v(-.24,.11,0),v(.24,.11,0)];both(.05,.9*amount,.16);};
 const jump=(spread=0,height=.22)=>{
   const lift=track(p,[[0,0],[.16,0],[.3,height],[.48,0],[.62,0],[.76,height],[.94,0],[1,0]]);
   const open=track(p,[[0,0],[.17,0],[.35,1],[.64,1],[.84,0],[1,0]]);
   const dip=track(p,[[0,0],[.14,.06],[.3,0],[.5,.05],[.62,.05],[.76,0],[.94,.05],[1,0]]);
   r.hip.y=.11+Math.sqrt(.89**2-(.01+spread*open)**2)+lift-dip;r.ankles=[v(-.15-spread*open,.11+lift,0),v(.15+spread*open,.11+lift,0)];return open;
 };
 const plank=(height=.56)=>{
   const tilt=Math.asin((height-.11)/1.43);r.pitch=Math.PI/2-tilt;
   r.hip.set(0,.11+.91*Math.sin(tilt),-.72+.91*Math.cos(tilt));
   r.ankles=[v(-.12,.11,-.72),v(.12,.11,-.72)];r.footPitch=[.9,.9];
   targets=[v(-.3,.10,.73),v(.3,.10,.73)];armPoles=[v(-.5,0,-1),v(.5,0,-1)];r.prop='mat';
 };
 const supine=()=>{r.hip.set(0,.18,0);r.pitch=-Math.PI/2;r.ankles=[v(-.15,.11,.87),v(.15,.11,.87)];targets=[v(-.30,.11,-.18),v(.30,.11,-.18)];legPoles=[v(0,1,0),v(0,1,0)];r.prop='mat';};
 const quadruped=()=>{r.hip.set(0,.58,-.25);r.pitch=Math.PI/2;r.ankles=[v(-.16,.11,-.62),v(.16,.11,-.62)];targets=[v(-.24,.10,.38),v(.24,.10,.38)];r.prop='mat';};
 switch(id){
 case 0:squat(t);break;
 case 1:plank(.64-.38*t);break;
 case 2:{r.symmetric=false;r.ankles=[v(-.18,.11,.18),v(.18,.11,-.22)];r.yaw=.12*alternate;
  targets=[v(-.22,1.50,.29+.48*left),v(.22,1.50,.29+.48*right)];armPoles=[v(-.3,-1,0),v(.3,-1,0)];r.prop='gloves';break;}
 case 3:{const open=jump(.30,.13);both(.08+2.9*open,0,.08);break;}
 case 4:r.symmetric=false;r.ankles=[v(-.15,.11+.43*left,.27*left),v(.15,.11+.43*right,.27*right)];armAngles=[[.08,.65*right-.25*left,1.1],[.08,.65*left-.25*right,1.1]];break;
 case 5:r.symmetric=false;r.ankles=[v(-.15,.11+.44*left,-.29*left),v(.15,.11+.44*right,-.29*right)];both(.08,0,1.3);break;
 case 6:jump(0,.16);both(.22,.06*Math.sin(4*Math.PI*p),.8+.06*Math.cos(4*Math.PI*p));r.prop='rope';break;
 case 7:case 9:{r.symmetric=false;const step=track(p,[[0,0],[.25,1],[.75,1],[1,0]]),down=track(p,[[0,0],[.25,0],[.5,1],[.7,0],[1,0]]);const z=id===7?.63:-.63;
  r.ankles[0].z=z*step;r.ankles[0].y+=.10*Math.sin(step*Math.PI);r.hip.z=z*.5*step;r.hip.y-=.34*down;r.pitch=.12*down;both(.05,.35,1.4);break;}
 case 8:r.symmetric=false;r.ankles[0].x-=.48*t;r.hip.x=-.30*t;r.hip.y-=.25*t;r.pitch=.22*t;both(.12,.9,1.1);break;
 case 10:{r.symmetric=false;const lift=track(p,[[0,0],[.3,1],[.68,1],[1,0]]);r.ankles[0]=v(-.16,.11+.28*lift,.32*lift);r.hip.y+=.20*t;r.hip.z=.22*t;r.ankles[1].y+=.18*t;r.prop='step';both(.08,0,.9);break;}
 case 11:r.hip.y+=.07*t;r.ankles.forEach(a=>a.y+=.07*t);r.footPitch=[.8*t,.8*t];break;
 case 12:{supine();const ang=.60*t;r.pitch=-Math.PI/2-ang;r.hip.set(0,.18+.52*Math.sin(ang),-.52+.52*Math.cos(ang));r.ankles=[v(-.18,.11,.40),v(.18,.11,.40)];targets=[v(-.30,.11,-.35),v(.30,.11,-.35)];break;}
 case 13:case 14:supine();r.pitch=-Math.PI/2+(id===13?1.02:.3)*t;r.ankles=[v(-.16,.11,.53),v(.16,.11,.53)];targets=undefined;both(.14,1.8,2.0);break;
 case 15:supine();r.symmetric=false;r.pitch+=.18;r.yaw=.10*alternate;r.ankles=[v(-.16,.35+.26*left,.55-.37*left),v(.16,.35+.26*right,.55-.37*right)];targets=undefined;both(.28,1.8,2);break;
 case 16:supine();r.symmetric=false;r.ankles=[v(-.16,.63-.43*t,.15+.64*t),v(.16,.63,.15)];targets=[v(-.2,.70,-.52),v(.2,.70-.46*t,-.52-.36*t)];break;
 case 17:quadruped();r.symmetric=false;targets![0]=v(-.24,.10+.57*t,.38+.40*t);r.ankles[1]=v(.16,.11+.47*t,-.62-.53*t);break;
 case 18:plank();r.hip.set(0,.689,-.72+Math.sqrt(.91**2-.579**2));r.pitch=Math.PI/2;targets=[v(-.245,.10,r.hip.z+.49),v(.245,.10,r.hip.z+.49)];r.symmetric=false;break;
 case 19:plank(.67);r.symmetric=false;break;
 case 20:r.hip.set(0,.16,0);r.pitch=Math.PI/2-.12*t;r.ankles=[v(-.13,.11+.13*t,-.89),v(.13,.11+.13*t,-.89)];targets=[v(-.18,.13+.19*t,1.08),v(.18,.13+.19*t,1.08)];r.prop='mat';break;
 case 21:supine();r.ankles=[v(-.14,.18+.905*Math.sin(-.077+1.4*t),.905*Math.cos(-.077+1.4*t)),v(.14,.18+.905*Math.sin(-.077+1.4*t),.905*Math.cos(-.077+1.4*t))];break;
 case 22:supine();r.symmetric=false;r.ankles=[v(-.14,.18+.905*Math.sin(.18+.12*alternate),.905*Math.cos(.18+.12*alternate)),v(.14,.18+.905*Math.sin(.18-.12*alternate),.905*Math.cos(.18-.12*alternate))];break;
 case 23:supine();r.symmetric=false;r.ankles=[v(-.1-.19*alternate,.3,.84),v(.1+.19*alternate,.34,.84)];break;
 case 24:{r.symmetric=false;const side=Math.floor(repetition/6)%2,sign=side===0?-1:1;r.hip.x=-sign*.035*t;r.ankles[side]=v(sign*(.15+.50*t),.11+.18*t,0);both(.15,0,.6);break;}
 case 25:quadruped();r.symmetric=false;r.ankles[1]=v(.16,.11+.60*t,-.62-.12*t);break;
 case 26:quadruped();r.symmetric=false;r.ankles[1]=v(.16+.45*t,.11+.3*t,-.62+.18*t);legPoles[1]=v(1,0,.3);break;
 case 27:{
  const fold=track(p,[[0,0],[.2,1],[.8,1],[1,0]]),walk=track(p,[[0,0],[.22,0],[.46,1],[.57,1],[.78,0],[1,0]]);
  const legAngle=Math.PI/2-1.17*walk;r.hip.set(0,.11+.91*Math.sin(legAngle),.91*Math.cos(legAngle));r.pitch=2.3*fold-1.13*walk;
  r.ankles=[v(-.14,.11,0),v(.14,.11,0)];r.prop='mat';
  const handY=1.01*(1-fold)+.10*fold;const handZ=.34*fold+.94*walk;
  targets=[v(-.26,handY,handZ),v(.26,handY,handZ)];
  if(walk>0&&walk<1){r.symmetric=false;targets[0].y+=.06*Math.max(0,Math.sin(p*16*Math.PI));targets[1].y+=.06*Math.max(0,-Math.sin(p*16*Math.PI));}
  armPoles=[v(-.3,0,-1),v(.3,0,-1)];break;
 }
 case 28:{
  const crouch=track(p,[[0,0],[.18,1],[.73,1],[.84,0],[1,0]]),back=track(p,[[0,0],[.23,0],[.34,1],[.58,1],[.69,0],[1,0]]);
  const flight=track(p,[[0,0],[.84,0],[.90,.24],[.98,0],[1,0]]);
  r.hip.set(0,1-.58*crouch+.04*back+.35*Math.sin(Math.PI*back)+flight,-.18*crouch+.30*back);r.pitch=.90*crouch+.27*back+.8*Math.sin(Math.PI*back);
  r.ankles=[v(-.17,.11+flight,-.72*back),v(.17,.11+flight,-.72*back)];r.prop='mat';
  targets=[v(-.27,1.02*(1-crouch)+.10*crouch+flight,.18+.53*crouch),v(.27,1.02*(1-crouch)+.10*crouch+flight,.18+.53*crouch)];
  armPoles=[v(-.4,0,-1),v(.4,0,-1)];break;
 }
 case 29:case 30:case 32:case 33:{
  const flight=Math.max(0,Math.sin(Math.PI*Math.max(0,Math.min(1,(p-.25)/.35))));
  const load=track(p,[[0,0],[.20,1],[.29,0],[.56,0],[.66,1],[.83,0],[1,0]]);
  const spread=id===33?.32*flight:0;
  r.hip.set(0,.11+Math.sqrt(.89**2-(.01+spread)**2)-.24*load+.36*flight,-.15*load);
  r.pitch=.25*load;r.ankles=[v(-.15-spread,.11+.36*flight,0),v(.15+spread,.11+.36*flight,0)];
  both(id===33?.08+2.3*flight:.1,id===33?0:1.8*flight-.3*load,.12);
  if(id===29)r.ankles.forEach(a=>{a.y+=.36*flight;a.z+=.16*flight;});
  if(id===30){const z=track(p,[[0,0],[.25,0],[.60,.5],[.72,.5],[.95,0],[1,0]]),returnHop=p>.72&&p<.95?.14*Math.sin((p-.72)/.23*Math.PI):0;r.hip.z+=z;r.hip.y+=returnHop;r.ankles.forEach(a=>{a.z+=z;a.y+=returnHop;});}
  break;
 }
 case 31:r.symmetric=false;r.hip.x=.25*alternate;r.ankles=[v(-.15+.34*alternate,.11+.12*right,0),v(.15+.34*alternate,.11+.12*left,0)];r.roll=-.10*alternate;armAngles=[[.3,.4*right,1],[.3,.4*left,1]];break;
 case 34:r.pitch=1.85*t;r.hip.z=-.35*t;r.hip.y-=.18*t;both(.03,r.pitch,.05);break;
 case 35:r.symmetric=false;r.roll=.32*t;armAngles=[[.08,0,.1],[2.8,0,.18]];break;
 case 36:{r.symmetric=false;const bend=Math.abs(alternate);r.pitch=1.72*bend;r.hip.y-=.19*bend;r.hip.z=-.2*bend;r.yaw=.2*alternate;r.ankles=[v(-.34,.11,0),v(.34,.11,0)];targets=[v(-.8,1.48,0).lerp(v(.30,.13,.1),left).lerp(v(-.1,1.65,0),right),v(.8,1.48,0).lerp(v(-.30,.13,.1),right).lerp(v(.1,1.65,0),left)];break;}
 case 37:both(1.4,.18*Math.sin(2*Math.PI*p),.08);armAngles[0][0]+=.16*Math.cos(2*Math.PI*p);armAngles[1][0]+=.16*Math.cos(2*Math.PI*p);break;
 case 38:both(.08,0,.14);break;
 case 39:r.symmetric=false;r.yaw=.50*alternate;both(1.45,0,.12);break;
 case 40:both(.08,Math.PI*t,.10);break;
 case 41:r.symmetric=false;r.roll=-.30*t;armAngles=[[2.85,0,.15],[.12,0,.1]];break;
 case 42:r.symmetric=false;r.ankles=[v(-.15,.11+.16*left,.08*left),v(.15,.11+.16*right,.08*right)];armAngles=[[.08,.3*right, .45],[.08,.3*left,.45]];break;
 case 43:r.symmetric=false;r.hip.x=-.07*t;r.ankles[1]=v(.13,.11+.3*t,.22*t);both(1.3,0,.13);break;
 case 44:r.symmetric=false;r.ankles[1]=v(.16,.11+.56*t,.28*t);targets=[v(-.24,1,.1).lerp(v(.04,1.12,.46),t),v(.24,1,.1).lerp(v(.28,1.12,.46),t)];break;
 case 45:case 46:r.symmetric=false;r.ankles[0].z=.12*alternate;r.ankles[1].z=-.12*alternate;r.footPitch=id===45?[-.3,-.3]:[.8,.8];r.ankles[0].y+=.07*left;r.ankles[1].y+=.07*right;if(id===46){r.hip.y+=.07;r.ankles.forEach(a=>a.y+=.07);}break;
 case 47:r.pitch=.12+.18*t;r.hip.z=.22*t;targets=[v(-.26,1.43,.63),v(.26,1.43,.63)];r.prop='wall';armPoles=[v(-.5,0,-1),v(.5,0,-1)];break;
 case 48:r.hip.set(0,.60-.17*t,.1);r.ankles=[v(-.16,.11,.78),v(.16,.11,.78)];targets=[v(-.29,.60,-.16),v(.29,.60,-.16)];r.prop='bench';break;
 case 49:supine();r.hip.y=.65;r.ankles=[v(-.23,.11,.65),v(.23,.11,.65)];targets=[v(-.32,.95+.35*t,-.52),v(.32,.95+.35*t,-.52)];r.prop='bench-weights';break;
 case 50:armPoles=[v(-.1,.3,-1),v(.1,.3,-1)];r.pitch=.95;r.hip.z=-.2;r.hip.y=.91;targets=[v(-.27,.72+.33*t,.33-.18*t),v(.27,.72+.33*t,.33-.18*t)];weights();break;
 case 51:both(.07,0,.15+2.05*t);weights();break;
 case 52:targets=[v(-.4+.12*t,1.60+.43*t,.02),v(.4-.12*t,1.60+.43*t,.02)];armPoles=[v(-1,-1,0),v(1,-1,0)];weights();break;
 case 53:both(.06+1.43*t,0,.13);weights();break;
 case 54:both(.07,1.57*t,.12);weights();break;
 case 55:both(.10,Math.PI,1.65*(1-t)+.10);weights();break;
 case 56:r.pitch=.95*t;r.hip.z=-.24*t;r.hip.y-=.16*t;targets=[v(-.25,.91-.54*t,.22),v(.25,.91-.54*t,.22)];r.prop='bar';break;
 case 57:armPoles=[v(-.2,-1,0),v(.2,-1,0)];r.pitch=.8*(1-t);r.hip.z=-.20*(1-t);r.hip.y-=.12*(1-t);targets=[v(-.09,.75+.58*t,.1+.6*t),v(.09,.75+.58*t,.1+.6*t)];r.prop='kettlebell';break;
 case 58:squat(t);armPoles=[v(-.2,-1,0),v(.2,-1,0)];targets=[v(-.09,1.38-.34*t,.3-.05*t),v(.09,1.38-.34*t,.3-.05*t)];r.prop='kettlebell';break;
 case 59:r.symmetric=false;armAngles=[[.10,0,.15+2.0*smooth(left)],[.10,0,.15+2.0*smooth(right)]];weights();break;
 }
 
 r.rotation.setFromAxisAngle(v(0,1,0),r.yaw).multiply(new Quaternion().setFromAxisAngle(v(0,0,1),r.roll)).multiply(new Quaternion().setFromAxisAngle(v(1,0,0),r.pitch));
 r.ankles.forEach(ankle=>ankle.x=r.hip.x+(ankle.x-r.hip.x)*.8);
 const local=(x:number,y:number,z:number)=>v(x,y,z).applyQuaternion(r.rotation).add(r.hip);
 if([13,14,15].includes(id)){targets=[local(-.125,.69,.07),local(.125,.69,.07)];armPoles=[v(-1,0,0),v(1,0,0)];}
 r.neck=local(0,.57,0);r.head=local(0,.73,.005);
 for(let i=0;i<2;i++){
  const sign=i===0?-1:1;r.hips[i]=r.hip.clone().add(v(sign*.112,0,0));r.shoulders[i]=local(sign*.245,.49+(id===38?.025*(1-Math.cos(2*Math.PI*p)):0),id===38?.035*Math.sin(2*Math.PI*p):0);
  const [knee,ankle]=chain(r.hips[i],r.ankles[i],legPoles[i],DIM.thigh,DIM.shin);r.knees[i]=knee;r.ankles[i]=ankle;
  // These floor movements use joint angles, so a target crossing an IK pole cannot flip a knee.
  if(id===18){
   const pull=smooth(i===0?left:right),a=-Math.asin(.579/.91)*(1-pull)-2.65*pull;
   r.knees[i]=r.hips[i].clone().add(v(0,.45*Math.sin(a),-.45*Math.cos(a)));
   const footY=.11+.07*Math.sin(Math.PI*pull),dy=footY-r.knees[i].y;
   r.ankles[i]=r.knees[i].clone().add(v(0,dy,-Math.sqrt(.46**2-dy**2)));
  }
  if(id===24&&i===Math.floor(repetition/6)%2){const direction=v(sign*Math.sin(.58*t),-Math.cos(.58*t),0);r.knees[i]=r.hips[i].clone().addScaledVector(direction,.45);r.ankles[i]=r.knees[i].clone().addScaledVector(direction,.46);}
  if(id===16){
   const extension=i===repetition%2?t:0,a=Math.PI/2-(Math.PI/2-.035)*extension,b=a-Math.PI/2*(1-extension);
   r.knees[i]=r.hips[i].clone().add(v(0,.45*Math.sin(a),.45*Math.cos(a)));
   r.ankles[i]=r.knees[i].clone().add(v(0,.46*Math.sin(b),.46*Math.cos(b)));
  }
  if([20,21,22,23,27].includes(id)){
   let direction;
   if(id===20){const a=-Math.asin(.05/.91)+.18*t;direction=v(0,Math.sin(a),-Math.cos(a));}
   else if(id===27)direction=v(0,.11-r.hip.y,-r.hip.z).normalize();
   else if(id===23){const wave=Math.sin(2*Math.PI*p),dx=sign*(.09+.23*Math.cos(2*Math.PI*p)),dy=.16-sign*.075*wave;direction=v(dx,dy,Math.sqrt(.91**2-dx**2-dy**2)).normalize();}
   else{const a=id===21?-.055+1.4*t:.19+(i===0?1:-1)*.12*alternate;direction=v(0,Math.sin(a),Math.cos(a));}
   r.knees[i]=r.hips[i].clone().addScaledVector(direction,.45);r.ankles[i]=r.knees[i].clone().addScaledVector(direction,.46);
  }
  if([16,20,21,22,23].includes(id)){const shin=r.ankles[i].clone().sub(r.knees[i]);r.footPitch[i]=Math.atan2(-shin.y,shin.z);}
  if(id===19&&i===repetition%2){const opposite=local(-sign*.245,.49,0);targets![i].lerp(opposite,t);}

  if([17,25,26].includes(id)){
   const a=i===1?(id===26?.95:Math.PI/2)*t:0;
   const thigh=id===26?v(sign*.45*Math.sin(a),-.45*Math.cos(a),0):v(0,-.45*Math.cos(a),-.45*Math.sin(a));
   const shin=id===25?v(0,.46*Math.sin(a),-.46*Math.cos(a)):v(0,-.02*(1-(i===1?t:0)),-Math.sqrt(.46**2-(.02*(1-(i===1?t:0)))**2));
   r.knees[i]=r.hips[i].clone().add(thigh);r.ankles[i]=r.knees[i].clone().add(shin);
  }
  if(targets){const [elbow,wrist]=chain(r.shoulders[i],targets[i],armPoles[i],DIM.upperArm,DIM.forearm);r.elbows[i]=elbow;r.wrists[i]=wrist;}
  else{const [abd,flex,bend]=armAngles[i];const q=new Quaternion().setFromAxisAngle(v(0,0,1),sign*abd).multiply(new Quaternion().setFromAxisAngle(v(1,0,0),-flex));
   const upper=v(0,-DIM.upperArm,0).applyQuaternion(q).applyQuaternion(r.rotation);r.elbows[i]=r.shoulders[i].clone().add(upper);
   const lower=v(0,-DIM.forearm*Math.cos(bend),DIM.forearm*Math.sin(bend)).applyQuaternion(q).applyQuaternion(r.rotation);r.wrists[i]=r.elbows[i].clone().add(lower);
  }
  if(id===16){const a=i!==repetition%2?1.48*t:0,direction=v(0,Math.cos(a),-Math.sin(a));r.elbows[i]=r.shoulders[i].clone().addScaledVector(direction,.30);r.wrists[i]=r.elbows[i].clone().addScaledVector(direction,.29);}
 }
 return r;
}
