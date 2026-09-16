import * as T from 'three';
import { makeTrainingRig, v } from './training-rig';
export type TrainingView = 'three-quarter' | 'front' | 'side';
/** A single articulated model shared by all exercises. Geometry never stretches across joints. */
export class TrainingRenderer {
 private renderer?:T.WebGLRenderer;
 private readonly context:CanvasRenderingContext2D;
 private width=600;private height=420;
 readonly scene=new T.Scene();
 readonly camera=new T.OrthographicCamera(-1.6,1.6,1.2,-1.2,.1,30);
 private readonly actor=new T.Group();
 private readonly torso=new T.Group();
 private readonly limbs:T.Mesh[][]=[];
 private readonly joints:T.Mesh[][]=[];
 private readonly hipCovers:T.Mesh[]=[];
 private readonly feet:T.Mesh[]=[];
 private readonly hands:T.Mesh[]=[];
 private readonly cuffs:T.Mesh[]=[];
 private readonly thumbs:T.Mesh[]=[];
 private readonly props=new Map<string,T.Group>();
 private readonly weights:T.Group[]=[];
 private readonly skin=new T.MeshStandardMaterial({color:0xd89e78,roughness:.84});
 private readonly shirt=new T.MeshStandardMaterial({color:0xc2dd8b,roughness:.92});
 private readonly shorts=new T.MeshStandardMaterial({color:0x25354b,roughness:.92});
 private readonly shoe=new T.MeshStandardMaterial({color:0xf0eee5,roughness:.86});
 private readonly dark=new T.MeshStandardMaterial({color:0x29333d,roughness:.72});
 private readonly metal=new T.MeshStandardMaterial({color:0x72828a,metalness:.6,roughness:.4});
 private readonly glove=new T.MeshStandardMaterial({color:0xdc6544,roughness:.55});
 private readonly sphere=new T.SphereGeometry(1,20,14);
 private readonly cylinder=new T.CylinderGeometry(1,1,1,16);
 private readonly box=new T.BoxGeometry(1,1,1);
 constructor(canvas:HTMLCanvasElement){
  this.context=canvas.getContext('2d')!;
  // Keep a readable canvas, including on devices where WebGL is unavailable or lost.
  try {
   const gpuCanvas=document.createElement('canvas');
   this.renderer=new T.WebGLRenderer({canvas:gpuCanvas,antialias:true,alpha:false,preserveDrawingBuffer:true});
   this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));this.renderer.setClearColor(0xe5e8df);
   this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;
   this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;
   gpuCanvas.addEventListener('webglcontextlost',()=>{this.renderer?.dispose();this.renderer=undefined;});
  } catch { this.renderer=undefined; }
  this.scene.add(new T.HemisphereLight(0xffffff,0x798579,2.5));
  const light=new T.DirectionalLight(0xfff4db,3);light.position.set(-3,6,4);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-3,right:3,top:3,bottom:-3});light.shadow.bias=-.001;this.scene.add(light);
  const floor=this.mesh(this.box,new T.MeshStandardMaterial({color:0xd2d8cb,roughness:1}),this.scene);floor.scale.set(200,.06,200);floor.position.y=-.04;floor.receiveShadow=true;floor.userData["floor"]=true;
  this.scene.add(this.actor);this.actor.add(this.torso);
  const trunk=this.mesh(new T.CylinderGeometry(.225,.175,.44,24),this.shirt,this.torso);trunk.position.y=.285;trunk.scale.z=.64;
  this.ellipsoid(this.torso,this.shirt,[0,.47,0],[.225,.10,.14]);
  this.ellipsoid(this.torso,this.shorts,[0,.04,0],[.165,.14,.135]);
  this.ellipsoid(this.torso,this.skin,[0,.566,0],[.064,.09,.064]);
  const head=new T.Group();head.position.set(0,.715,0);this.torso.add(head);
  this.ellipsoid(head,this.skin,[0,0,0],[.109,.142,.104]);
  const hair=new T.MeshStandardMaterial({color:0x342b29,roughness:1});
  this.ellipsoid(head,hair,[0,.085,-.016],[.11,.064,.10]);
  this.ellipsoid(head,this.skin,[0,-.013,.102],[.019,.024,.027]);
  for(const sign of [-1,1]){
   this.ellipsoid(head,this.skin,[sign*.107,-.012,-.005],[.018,.034,.022]);
   this.ellipsoid(head,this.dark,[sign*.039,.024,.096],[.008,.009,.005]);
  }
  this.ellipsoid(head,new T.MeshStandardMaterial({color:0x9c6450}),[0,-.063,.087],[.023,.004,.005]);
  for(let i=0;i<2;i++){
   this.limbs[i]=[this.mesh(this.cylinder,this.skin,this.actor),this.mesh(this.cylinder,this.skin,this.actor),this.mesh(this.cylinder,this.skin,this.actor),this.mesh(this.cylinder,this.skin,this.actor),this.mesh(this.cylinder,this.shorts,this.actor),this.mesh(this.cylinder,this.shirt,this.actor)];
   this.hipCovers[i]=this.mesh(this.sphere,this.shorts,this.actor);
   this.joints[i]=Array.from({length:4},()=>this.mesh(this.sphere,this.skin,this.actor));
   this.feet[i]=this.mesh(this.sphere,this.shoe,this.actor);this.hands[i]=this.mesh(this.sphere,this.skin,this.actor);this.cuffs[i]=this.mesh(this.cylinder,this.dark,this.actor);this.thumbs[i]=this.mesh(this.sphere,this.glove,this.actor);
   const weight=this.dumbbell();this.actor.add(weight);this.weights.push(weight);
  }
  this.buildProps();
 }
 private mesh(geometry:T.BufferGeometry,material:T.Material,parent:T.Object3D):T.Mesh{const mesh=new T.Mesh(geometry,material);mesh.castShadow=true;parent.add(mesh);return mesh;}
 private ellipsoid(parent:T.Object3D,material:T.Material,position:number[],scale:number[]):T.Mesh{const m=this.mesh(this.sphere,material,parent);m.position.set(...position as [number,number,number]);m.scale.set(...scale as [number,number,number]);return m;}
 private block(parent:T.Object3D,material:T.Material,position:number[],scale:number[]):T.Mesh{const m=this.mesh(this.box,material,parent);m.position.set(...position as [number,number,number]);m.scale.set(...scale as [number,number,number]);return m;}
 private segment(mesh:T.Mesh,a:T.Vector3,b:T.Vector3,radius:number){mesh.position.copy(a).lerp(b,.5);mesh.quaternion.setFromUnitVectors(v(0,1,0),b.clone().sub(a).normalize());mesh.scale.set(radius,a.distanceTo(b),radius);}
 private dumbbell():T.Group{const g=new T.Group();const bar=this.mesh(this.cylinder,this.metal,g);bar.rotation.z=Math.PI/2;bar.scale.set(.018,.24,.018);for(const s of [-1,1]){const plate=this.mesh(this.cylinder,this.dark,g);plate.rotation.z=Math.PI/2;plate.position.x=s*.10;plate.scale.set(.075,.055,.075);}return g;}
 private buildProps(){
  const prop=(name:string)=>{const g=new T.Group();this.scene.add(g);this.props.set(name,g);return g;};
  const mat=prop('mat');this.block(mat,new T.MeshStandardMaterial({color:0x68847c}),[0,-.002,.05],[1.28,.025,2.7]);
  const bench=prop('bench');this.block(bench,this.dark,[0,.54,-.40],[.88,.12,.50]);for(const x of [-.32,.32])this.block(bench,this.metal,[x,.25,-.40],[.055,.5,.36]);
  const benchWeights=prop('bench-weights');this.block(benchWeights,this.dark,[0,.48,-.32],[.44,.12,1.22]);for(const z of [-.75,.12])this.block(benchWeights,this.metal,[0,.24,z],[.4,.48,.06]);
  this.block(prop('step'),this.dark,[0,.13,.42],[.8,.26,.48]);
  const wall=prop('wall');const wm=new T.MeshStandardMaterial({color:0x9da99d,transparent:true,opacity:.35});this.block(wall,wm,[0,1,.67],[1.5,2,.06]);
  const bar=prop('bar');const shaft=this.mesh(this.cylinder,this.metal,bar);shaft.rotation.z=Math.PI/2;shaft.scale.set(.018,1,.018);for(const x of [-.44,.44]){const disk=this.mesh(this.cylinder,this.dark,bar);disk.rotation.z=Math.PI/2;disk.position.x=x;disk.scale.set(.13,.065,.13);}
  const bell=prop('kettlebell');this.ellipsoid(bell,this.dark,[0,-.11,0],[.12,.13,.10]);const handle=this.mesh(new T.TorusGeometry(.065,.012,8,20),this.metal,bell);handle.position.y=.025;
  const rope=prop('rope');for(let i=0;i<40;i++)this.mesh(this.cylinder,this.glove,rope);
 }
 resize(width:number,height:number){this.width=width;this.height=height;this.context.canvas.width=Math.round(width*2);this.context.canvas.height=Math.round(height*2);this.context.setTransform(2,0,0,2,0,0);this.renderer?.setSize(width,height,false);const ratio=width/height;this.camera.left=-1.3*ratio;this.camera.right=1.3*ratio;this.camera.top=1.3;this.camera.bottom=-1.3;this.camera.updateProjectionMatrix();}
 draw(id:number,phase:number,view:TrainingView='three-quarter',repetition=0){
  const r=makeTrainingRig(id,phase,repetition);this.torso.position.copy(r.hip);this.torso.quaternion.copy(r.rotation);
  for(let i=0;i<2;i++){
   const segments=[[r.hips[i].clone().lerp(r.knees[i],.43),r.knees[i]],[r.knees[i],r.ankles[i]],[r.shoulders[i],r.elbows[i]],[r.elbows[i],r.wrists[i]]];
   segments.forEach(([a,b],j)=>this.segment(this.limbs[i][j],a,b,[.073,.05,.047,.037][j]));
   // Rounded cloth caps bridge the pelvis and trouser legs throughout hip rotation.
   // Skin starts inside the hem, so it cannot poke through the upper cut of the shorts.
   this.hipCovers[i].position.copy(r.hips[i]);this.hipCovers[i].scale.setScalar(.10);
   this.segment(this.limbs[i][4],r.hips[i],r.hips[i].clone().lerp(r.knees[i],.48),.09);
   this.segment(this.limbs[i][5],r.shoulders[i],r.shoulders[i].clone().lerp(r.elbows[i],.50),.072);
   [r.knees[i],r.ankles[i],r.elbows[i],r.shoulders[i]].forEach((a,j)=>{this.joints[i][j].position.copy(a);this.joints[i][j].scale.setScalar([.064,.04,.04,.079][j]);this.joints[i][j].material=j===3?this.shirt:this.skin;});
   this.feet[i].position.copy(r.ankles[i]).add(v(0,-.045,.065));this.feet[i].scale.set(.064,.053,.13);this.feet[i].rotation.x=r.footPitch[i];
   const footAngle=r.footPitch[i],soleRadius=Math.hypot(.053*Math.cos(footAngle),.13*Math.sin(footAngle));
   this.feet[i].position.y=Math.max(soleRadius,r.ankles[i].y-.045*Math.cos(footAngle)-.065*Math.sin(footAngle));
   this.feet[i].position.z=r.ankles[i].z+.065*Math.cos(footAngle)-.045*Math.sin(footAngle);
   this.hands[i].position.copy(r.wrists[i]);this.hands[i].scale.set(r.prop==='gloves'?.067:.041,r.prop==='gloves'?.07:.05,r.prop==='gloves'?.075:.037);this.hands[i].material=r.prop==='gloves'?this.glove:this.skin;
   this.cuffs[i].visible=this.thumbs[i].visible=r.prop==='gloves';
   if(r.prop==='gloves'){
    const direction=r.wrists[i].clone().sub(r.elbows[i]).normalize();
    this.hands[i].position.addScaledVector(direction,.035);this.hands[i].scale.set(.064,.085,.060);this.hands[i].quaternion.setFromUnitVectors(v(0,1,0),direction);
    this.segment(this.cuffs[i],r.wrists[i].clone().addScaledVector(direction,-.025),r.wrists[i].clone().addScaledVector(direction,.012),.047);
    this.thumbs[i].position.copy(this.hands[i].position).add(v(i===0?.045:-.045,-.015,.018));this.thumbs[i].scale.set(.028,.04,.028);
   }else this.hands[i].quaternion.identity();
   this.weights[i].visible=['dumbbells','bench-weights'].includes(r.prop);this.weights[i].position.copy(r.wrists[i]);
   if(id===59)this.weights[i].quaternion.setFromUnitVectors(v(1,0,0),r.wrists[i].clone().sub(r.elbows[i]).normalize());else this.weights[i].quaternion.identity();
  }
  for(const [name,g] of this.props)g.visible=name===r.prop;
  if(['bar','kettlebell'].includes(r.prop))this.props.get(r.prop)!.position.copy(r.wrists[0]).lerp(r.wrists[1],.5);
  if(r.prop==='rope'){
   const rope=this.props.get('rope')!,angle=phase*Math.PI*4+.8*Math.PI;
   const points=Array.from({length:41},(_,i)=>{const u=i/40,bow=Math.sin(Math.PI*u);return r.wrists[0].clone().lerp(r.wrists[1],u).add(v(-.25*Math.sin(2*Math.PI*u),-1.05*bow*Math.cos(angle),1.05*bow*Math.sin(angle)));});
   rope.children.forEach((mesh,i)=>this.segment(mesh as T.Mesh,points[i],points[i+1],.007));
  }
  const floorPose=['mat','bench','bench-weights'].includes(r.prop);
  const target=v(0,floorPose?.55:1,0);
  const direction=view==='front'?v(0,.6,6):view==='side'?v(6,.35,.05):v(3.8,2.1,5);
  this.camera.position.copy(target).add(direction);this.camera.lookAt(target);if(this.renderer){this.renderer.render(this.scene,this.camera);this.context.drawImage(this.renderer.domElement,0,0,this.width,this.height);}else this.drawSoftware();
 }
 /** Painter projection uses the same mesh and poses as the GPU path. */
 private drawSoftware(){
  const c=this.context,w=this.width,h=this.height;
  c.fillStyle='#e5e8df';c.fillRect(0,0,w,h);
  this.scene.updateMatrixWorld(true);this.camera.updateMatrixWorld(true);
  const triangles:{xy:number[];z:number;color:string;opacity:number}[]=[];
  const light=v(-3,6,4).normalize();
  this.scene.traverseVisible(object=>{
   if(!(object instanceof T.Mesh)||object.userData['floor'])return;
   const geometry=object.geometry,positions=geometry.getAttribute('position'),index=geometry.index;
   const material=object.material as T.MeshStandardMaterial;
   const projected:T.Vector3[]=[],world:T.Vector3[]=[];
   for(let i=0;i<positions.count;i++){const point=v().fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld);world.push(point);projected.push(point.clone().project(this.camera));}
   const count=index?index.count:positions.count;
   for(let i=0;i<count;i+=3){
    const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j),[a,b,d]=ids.map(j=>world[j]);
    const normal=b.clone().sub(a).cross(d.clone().sub(a)).normalize();
    if(normal.dot(this.camera.position.clone().sub(a))<=0)continue;
    const vertices=ids.map(j=>projected[j]);
    const intensity=.67+.33*Math.max(0,normal.dot(light));
    const color=material.color.clone().multiplyScalar(intensity).convertLinearToSRGB();
    triangles.push({xy:vertices.flatMap(p=>[(p.x*.5+.5)*w,(-p.y*.5+.5)*h]),z:vertices.reduce((sum,p)=>sum+p.z,0)/3,color:`rgb(${Math.round(color.r*255)},${Math.round(color.g*255)},${Math.round(color.b*255)})`,opacity:material.opacity});
   }
  });
  triangles.sort((a,b)=>b.z-a.z);
  for(const triangle of triangles){const q=triangle.xy;c.globalAlpha=triangle.opacity;c.fillStyle=triangle.color;c.strokeStyle=triangle.color;c.lineWidth=.35;c.beginPath();c.moveTo(q[0],q[1]);c.lineTo(q[2],q[3]);c.lineTo(q[4],q[5]);c.closePath();c.fill();c.stroke();}
  c.globalAlpha=1;
 }
 dispose(){this.scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m.dispose());}});this.renderer?.dispose();this.renderer?.forceContextLoss();}
}
