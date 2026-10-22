import * as T from 'three';

export type MonsterArt = 'mossback' | 'twigwalker';
// One stride, eight keys: right contact/down/passing/up, then left contact/down/passing/up.
// The stance foot stays down while the opposite leg swings forward. No yaw keys exist.
const DEPTH = [1, .7, .1, -.55, -1, -.65, .1, .8];
const LIFT = [0, 0, 0, 0, 0, .035, .095, .06];
function spline(keys: number[], phase: number) {
 const p=((phase%8)+8)%8,i=Math.floor(p),t=p-i;
 const a=keys[(i+7)%8],b=keys[i],c=keys[(i+1)%8],d=keys[(i+2)%8];
 return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
}
export function gaitPose(phase: number) {
 return {right:{depth:spline(DEPTH,phase),lift:Math.max(0,spline(LIFT,phase))},
  left:{depth:spline(DEPTH,phase+4),lift:Math.max(0,spline(LIFT,phase+4))},bob:.004*Math.cos(phase*Math.PI/2)};
}
function smooth(a:number,b:number,x:number){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}
const RIGS={
 mossback:{center:.565,halfBody:.22,hip:.53,knee:.70,rightLeg:.425,leftLeg:.70},
 twigwalker:{center:.45,halfBody:.115,hip:.52,knee:.68,rightLeg:.39,leftLeg:.51}
};
/** Skin one immutable frontal painting. The torso cannot turn or flip between poses. */
export function deformVertex(x:number,y:number,art:MonsterArt,phase:number):[number,number]{
 const rig=RIGS[art],pose=gaitPose(phase);
 const arm=smooth(rig.halfBody-.025,rig.halfBody+.05,Math.abs(x-rig.center))*smooth(.29,.43,y)*(1-smooth(.68,.77,y));
 const side=smooth(rig.center-.02,rig.center+.02,x);
 const depth=pose.right.depth*(1-side)+pose.left.depth*side,lift=pose.right.lift*(1-side)+pose.left.lift*side;
 const leg=smooth(rig.hip,rig.hip+.10,y)*(1-arm);
 const kneeBend=Math.exp(-(((y-rig.knee)/.11)**2))*lift*.28;
 const foot=smooth(rig.hip,.94,y);
 // Perspective changes reach/foot size, never the heading of the character.
 const legCenter=rig.rightLeg*(1-side)+rig.leftLeg*side;
 // Mossback's right leg keeps its horizontal silhouette throughout the stride.
 // Its broad foot otherwise flares sideways at the forward-reach key.
 const lateralPerspective=art==='mossback'?side:1;
 const dx=(x-legCenter)*depth*.07*leg*foot*lateralPerspective;
 const dy=leg*(depth*.024*foot-lift*foot-kneeBend)+arm*(-depth*.026)*smooth(.3,.62,y);
 return [x+dx,y+dy+pose.bob*(1-smooth(.83,.97,y))];
}
export class MonsterGaitRenderer {
 private readonly renderer:T.WebGLRenderer;
 private readonly scene=new T.Scene();
 private readonly camera=new T.OrthographicCamera(-.5,.5,.5,-.5,.1,10);
 private readonly geometry=new T.PlaneGeometry(1,1,40,40);
 private readonly texture:T.Texture;
 private readonly material:T.MeshBasicMaterial;
 private readonly mesh:T.Mesh;
 private readonly rest:Float32Array;
 constructor(canvas:HTMLCanvasElement,private readonly art:MonsterArt){
  this.renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,premultipliedAlpha:true});
  this.renderer.setSize(448,448,false);this.renderer.setClearColor(0,0);
  this.texture=new T.TextureLoader().load('/assets/monstrocity/monster-rig.png');this.texture.colorSpace=T.SRGBColorSpace;
  this.texture.minFilter=T.LinearFilter;this.texture.generateMipmaps=false;
  this.texture.repeat.set(.5,1);this.texture.offset.x=art==='mossback'?0:.5;
  this.material=new T.MeshBasicMaterial({map:this.texture,transparent:true,depthTest:false});
  this.mesh=new T.Mesh(this.geometry,this.material);this.mesh.scale.setScalar(.90);
  // Center the measured torso, not the asymmetrical texture margins.
  this.mesh.position.x=(.5-RIGS[art].center)*.9;
  this.scene.add(this.mesh);this.camera.position.z=2;
  this.rest=new Float32Array(this.geometry.attributes['position'].array);
 }
 draw(phase:number){
  const positions=this.geometry.attributes['position'] as T.BufferAttribute;
  for(let i=0;i<positions.count;i++){
   const [x,y]=deformVertex(this.rest[i*3]+.5,.5-this.rest[i*3+1],this.art,phase);
   positions.setXY(i,x-.5,.5-y);
  }
  positions.needsUpdate=true;this.renderer.render(this.scene,this.camera);
 }
 destroy(){this.geometry.dispose();this.material.dispose();this.texture.dispose();this.renderer.dispose();}
}
