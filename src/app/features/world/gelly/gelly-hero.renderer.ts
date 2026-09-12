import * as THREE from 'three';
import { HeroAction, HeroRenderer } from '../../../shared/world/hero-renderer.interface';

/** A small articulated jelly rig. All facial features inherit body deformation. */
export class GellyHeroRenderer implements HeroRenderer {
  readonly mesh = new THREE.Group();
  readonly spawnY = .15;
  private readonly rig = new THREE.Group();
  private readonly torso = new THREE.Group();
  private readonly eyes: THREE.Group[] = [];
  private readonly arms: THREE.Group[] = [];
  private readonly feet: THREE.Mesh[] = [];
  private readonly shadow = new THREE.Mesh(new THREE.CircleGeometry(1.25, 40), new THREE.MeshBasicMaterial({color: 0x211343, transparent: true, opacity: .24, depthWrite: false}));
  private readonly halo = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.56, 64), new THREE.MeshBasicMaterial({color: 0xff94dd, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false}));
  private focus = false;
  private gait = 0;
  private blend = 0;
  private jumpTime = -1;
  private waveTime = -1;
  private landing = 0;

  build(scene: THREE.Scene): void {
    const jelly = new THREE.MeshPhysicalMaterial({color: 0xf447ab, roughness: .28, metalness: .02, clearcoat: 1, clearcoatRoughness: .15, sheen: .5, sheenColor: new THREE.Color(0xffa0da)});
    const sole = new THREE.MeshPhysicalMaterial({color: 0xd82b8e, roughness: .34, clearcoat: .8});
    const dark = new THREE.MeshBasicMaterial({color: 0x30142e});
    const white = new THREE.MeshBasicMaterial({color: 0xfff7fd});
    const sphere = new THREE.SphereGeometry(1, 32, 24);
    const part = (parent: THREE.Object3D, mat: THREE.Material, xyz: number[], scale: number[]) => {
      const m = new THREE.Mesh(sphere,mat);m.position.set(...xyz as [number,number,number]);m.scale.set(...scale as [number,number,number]);m.castShadow=true;parent.add(m);return m;
    };
    this.mesh.add(this.rig);this.rig.add(this.torso);this.torso.position.y=1.35;
    part(this.torso,jelly,[0,0,0],[1.02,1.12,.84]);
    part(this.torso,jelly,[0,1.12,0],[.23,.24,.22]);
    part(this.torso,white,[-.38,.65,.65],[.13,.21,.025]).rotation.z=-.5;
    for(const side of [-1,1]) {
      const arm=new THREE.Group();arm.position.set(side*.88,-.2,0);this.torso.add(arm);
      part(arm,jelly,[side*.16,-.23,0],[.25,.43,.26]);this.arms.push(arm);
      this.feet.push(part(this.rig,sole,[side*.48,.22,.18],[.36,.23,.46]));
      const eye=new THREE.Group();eye.position.set(side*.34,.13,.79);this.torso.add(eye);this.eyes.push(eye);
      part(eye,dark,[0,0,0],[.155,.235,.065]);
      part(eye,white,[-.044,.078,.055],[.055,.072,.024]);
      part(eye,white,[.05,-.073,.057],[.026,.032,.015]);
      part(this.torso,new THREE.MeshBasicMaterial({color:0xff94ba}),[side*.61,-.18,.687],[.18,.088,.035]);
    }
    const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.16,-.2,.842),new THREE.Vector3(0,-.41,.89),new THREE.Vector3(.16,-.2,.842));
    this.torso.add(new THREE.Mesh(new THREE.TubeGeometry(curve,20,.028,8,false),dark));
    this.shadow.rotation.x=-Math.PI/2;this.shadow.position.y=.06;
    this.halo.rotation.x=-Math.PI/2;this.halo.position.y=.07;
    this.mesh.add(this.shadow,this.halo);scene.add(this.mesh);
  }

  playAction(action: HeroAction): void {
    if(action==='jump' && this.jumpTime<0){this.jumpTime=0;this.waveTime=-1;}
    if(action==='wave' && this.jumpTime<0)this.waveTime=0;
  }

  update(delta: number, movement: {x:number;z:number}, time: number): void {
    const speed=Math.hypot(movement.x,movement.z);
    this.blend=speed === 0 ? 0 : THREE.MathUtils.damp(this.blend,Math.min(speed,1.6),10,delta);
    this.gait+=delta*(9+speed*3);
    if(speed>.05){
      const target=Math.atan2(movement.x,movement.z);
      const difference=Math.atan2(Math.sin(target-this.mesh.rotation.y),Math.cos(target-this.mesh.rotation.y));
      this.mesh.rotation.y+=difference*(1-Math.exp(-12*delta));
      this.waveTime=-1;
    }
    let lift=0, stretch=1;
    if(this.jumpTime>=0){
      this.jumpTime+=delta;
      const t=this.jumpTime;
      if(t<.12)stretch=1-.25*Math.sin(t/.12*Math.PI/2);
      else {const flight=(t-.12)/.72;lift=2.7*4*flight*(1-flight);stretch=1+.22*Math.sin(Math.PI*flight);}
      if(t>=.84){this.jumpTime=-1;lift=0;this.landing=1;}
    }
    this.landing=Math.max(0,this.landing-delta*5);
    stretch-=this.landing*.28;
    const bounce=Math.abs(Math.sin(this.gait))*this.blend*.16;
    const sy=stretch+Math.sin(time*2.3)*.025+Math.cos(this.gait*2)*this.blend*.045;
    this.torso.scale.set(1/Math.sqrt(sy),sy,1/Math.sqrt(sy));
    this.torso.position.y=1.35+(sy-1)*1.08;
    this.rig.position.y=Math.max(0,lift)+bounce;
    this.torso.rotation.z=Math.sin(this.gait)*.065*this.blend;
    this.torso.rotation.x=this.blend*.09;
    for(let i=0;i<2;i++){
      const phase=this.gait+i*Math.PI;
      this.feet[i].position.y=.22+Math.max(0,Math.sin(phase))*.32*this.blend;
      this.feet[i].position.z=.18+Math.cos(phase)*.3*this.blend;
      this.feet[i].rotation.x=Math.cos(phase)*.3*this.blend;
      this.arms[i].rotation.x=-Math.cos(phase)*.65*this.blend;
      this.arms[i].rotation.z=(i===0?1:-1)*(.12+Math.max(0,lift)*.22);
    }
    if(this.waveTime>=0){
      this.waveTime+=delta;
      this.arms[1].rotation.z=-2.35+Math.sin(this.waveTime*19)*.3;
      if(this.waveTime>1.8)this.waveTime=-1;
    }
    const blinkPhase=time%4.7;
    const blink=blinkPhase>4.48?Math.max(.08,Math.abs(blinkPhase-4.59)/.11):1;
    this.eyes.forEach(eye=>eye.scale.y=blink);
    const shadowScale=1-Math.min(lift,3)*.14;
    this.shadow.scale.setScalar(shadowScale);
    this.shadow.material.opacity=.24-Math.min(lift,3)*.045;
    this.halo.material.opacity=THREE.MathUtils.damp(this.halo.material.opacity,this.focus?.55:0,6,delta);
    this.halo.scale.setScalar(1+Math.sin(time*3)*.06);
  }

  getEyePosition(target: THREE.Vector3): void {
    this.mesh.updateWorldMatrix(true, true);
    target.set(0, .13, .9);
    this.torso.localToWorld(target);
  }

  setFocused(focused:boolean):void {this.focus=focused;}
  destroy():void {
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
    this.mesh.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.mesh.removeFromParent();
  }
}
