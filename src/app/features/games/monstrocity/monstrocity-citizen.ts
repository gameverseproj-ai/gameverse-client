import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { batchRigidParts } from './monstrocity-explorer';

export const CITIZEN_STYLES = [
 {id:'courier',skin:0xb98060,hair:0x342b25,coat:0x576b88,trim:0xa9b5bb,pants:0x34434a,width:.23,height:1.02,hat:'cap',accessory:'satchel'},
 {id:'gardener',skin:0xd0a180,hair:0x8c7761,coat:0x89916c,trim:0xd6c49a,pants:0x5d5142,width:.28,height:.97,hat:'brim',accessory:'apron'},
 {id:'mechanic',skin:0x956449,hair:0x292725,coat:0x667a7c,trim:0xccad70,pants:0x343b44,width:.27,height:1.05,hat:'beanie',accessory:'vest'},
 {id:'teacher',skin:0xd2aa8a,hair:0x5b443a,coat:0x8a6c82,trim:0xcabda7,pants:0x41404b,width:.20,height:1.03,hat:'bob',accessory:'satchel'},
 {id:'baker',skin:0xba8b6e,hair:0x675044,coat:0xb5a88b,trim:0xe1d4b4,pants:0x5d6559,width:.29,height:1,hat:'cap',accessory:'apron'},
 {id:'night-watch',skin:0x806049,hair:0x32302c,coat:0x465560,trim:0x9aa5a0,pants:0x343e43,width:.28,height:1.08,hat:'brim',accessory:'vest'},
 {id:'student',skin:0xd5ab88,hair:0x382d28,coat:0xbc9658,trim:0xe0d5b3,pants:0x4d6172,width:.21,height:.94,hat:'hood',accessory:'none'},
 {id:'neighbour',skin:0xa7795c,hair:0x9c9585,coat:0x947665,trim:0xcbb7a1,pants:0x545c56,width:.25,height:.96,hat:'bun',accessory:'scarf'},
 {id:'traveller',skin:0xdaa78a,hair:0x654032,coat:0x5f7f7d,trim:0xc0b899,pants:0x3b454c,width:.22,height:1.04,hat:'scarf',accessory:'satchel'},
 {id:'caretaker',skin:0x9f775b,hair:0x77796f,coat:0x7f7355,trim:0xb4b595,pants:0x414b42,width:.26,height:1,hat:'beanie',accessory:'vest'},
] as const;

/** Townspeople have their own clothing and silhouettes; they never use the explorer outfit. */
export function createCitizen(index:number,material:(color:number)=>T.MeshStandardMaterial){
 const style=CITIZEN_STYLES[index%CITIZEN_STYLES.length],root=new T.Group();
 root.name='citizen-'+style.id;root.userData['appearance']=style.id;
 const mesh=(geometry:T.BufferGeometry,x:number,y:number,z:number,color:number,parent:T.Group=root)=>{
  const m=new T.Mesh(geometry,material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
 };
 const oval=(x:number,y:number,z:number,w:number,h:number,d:number,color:number,parent=root)=>{const m=mesh(new T.SphereGeometry(1,14,10),x,y,z,color,parent);m.scale.set(w,h,d);return m;};
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:number,parent=root)=>mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(.035,w/5,h/5,d/5)),x,y,z,color,parent);
 const tube=(points:number[][],width:number,color:number,parent=root)=>mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p[0],p[1],p[2]))),10,width,5,false),0,0,0,color,parent);
 const coat=new T.LatheGeometry([[0,0],[style.width*.9,.015],[style.width,.07],[style.width*.84,.3],[style.width, .52],[style.width*.68,.60],[0,.61]].map(([r,y])=>new T.Vector2(r,y)),18);
 const body=mesh(coat,0,.77,0,style.coat);body.scale.z=.7;
 oval(0,.79,0,style.width*.8,.12,.13,style.pants);
 oval(0,1.42,0,.07,.10,.067,style.skin);
 box(0,1.16,.155,.085,.35,.025,style.trim);
 for(const side of [-1,1]){const collar=box(side*.075,1.35,.13,.10,.13,.035,style.trim);collar.rotation.z=side*.45;}
 if(style.accessory==='apron'){
  box(0,.94,.18,style.width*1.55,.48,.035,style.trim);
  box(0,1.23,.16,.20,.23,.025,style.trim);
  box(.06,.95,.205,.14,.11,.018,style.coat);
 }else if(style.accessory==='vest'){
  for(const side of [-1,1]){box(side*.13,1.12,.14,.18,.39,.06,style.trim);box(side*.13,.99,.18,.13,.085,.025,style.pants);}
 }else if(style.accessory==='satchel'){
  box(-style.width-.025,.88,-.02,.19,.25,.13,0x6d5038);
  tube([[-style.width,.9,.05],[0,1.17,.18],[style.width*.75,1.36,.06]],.018,0x5a4434);
 }else if(style.accessory==='scarf'){
  oval(0,1.39,.02,.12,.045,.10,0xba9b74);box(-.07,1.20,.18,.10,.30,.025,0xba9b74);
 }
 const head=new T.Group();head.name='head';head.position.y=1.65;root.add(head);
 oval(0,0,0,.146,.19,.132,style.skin,head);
 oval(0,-.09,.01,.11,.10,.10,style.skin,head);
 for(const side of [-1,1]){
  oval(side*.145,0,-.005,.022,.04,.023,style.skin,head);
  oval(side*.052,.025,.125,.009,.010,.004,0x34322d,head);
  tube([[side*.082,.065,.105],[side*.05,.071,.12],[side*.025,.064,.113]],.005,style.hair,head);
 }
 oval(0,-.025,.126,.019,.035,.023,style.skin,head);
 tube([[-.028,-.084,.112],[0,-.087,.123],[.028,-.081,.112]],.0035,0x815c4c,head);
 const cap=mesh(new T.SphereGeometry(1,18,12,0,Math.PI*2,0,Math.PI*.57),0,.025,-.014,style.hair,head);cap.scale.set(.153,.185,.145);
 if(style.hat==='bob'){
  for(const side of [-1,1])oval(side*.13,-.02,-.045,.035,.14,.10,style.hair,head);
 }else if(style.hat==='bun'){
  oval(0,.02,-.13,.14,.14,.045,style.hair,head);oval(0,.045,-.18,.074,.075,.06,style.hair,head);
 }else if(style.hat==='cap'){
  oval(0,.14,0,.163,.10,.15,style.coat,head);const bill=box(0,.105,.16,.24,.026,.15,style.coat,head);bill.rotation.x=-.12;
 }else if(style.hat==='brim'){
  mesh(new T.CylinderGeometry(.21,.21,.035,24),0,.105,0,style.trim,head);mesh(new T.CylinderGeometry(.13,.15,.15,20),0,.18,0,style.trim,head);
 }else if(style.hat==='beanie'){
  oval(0,.13,-.015,.16,.12,.15,style.trim,head);mesh(new T.CylinderGeometry(.16,.16,.055,20),0,.095,-.01,style.trim,head);
 }else if(style.hat==='hood'){
  oval(0,.025,-.10,.19,.235,.14,style.coat,head);tube([[-.15,-.08,.05],[-.16,.10,.07],[0,.22,.05],[.16,.10,.07],[.15,-.08,.05]],.027,style.trim,head);
 }else if(style.hat==='scarf'){
  tube([[-.13,-.06,.08],[-.15,.13,.05],[0,.21,.01],[.15,.13,.05],[.13,-.06,.08]],.036,style.trim,head);
  oval(0,-.12,-.12,.14,.14,.055,style.trim,head);
 }
 // Keep the shared animation contract: left arm/leg, then right arm/leg; named knees.
 for(const side of [-1,1]){
  const arm=new T.Group();arm.name='limb';arm.position.set(side*(style.width+.025),1.30,0);root.add(arm);
  oval(side*.015,-.12,0,.078,.17,.078,style.coat,arm);oval(side*.025,-.29,.01,.065,.12,.068,style.coat,arm);
  box(side*.025,-.36,.012,.12,.045,.13,style.trim,arm);oval(side*.025,-.42,.015,.047,.067,.04,style.skin,arm);
  const leg=new T.Group();leg.name='limb';leg.position.set(side*.115,.77,0);root.add(leg);
  oval(0,-.15,0,.09,.19,.095,style.pants,leg);
  const knee=new T.Group();knee.name='knee';knee.position.y=-.33;leg.add(knee);
  oval(0,-.13,0,.073,.16,.077,style.pants,knee);box(0,-.31,.04,.16,.14,.27,0x49443b,knee);box(0,-.37,.05,.17,.035,.28,0x303831,knee);
 }
 root.scale.set(style.id==='baker'?1.06:1,style.height,1);batchRigidParts(root);return root;
}
