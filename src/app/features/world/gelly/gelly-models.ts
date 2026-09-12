import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type GellyModelKind = 'snake' | '2048-temple' | 'tetris-factory' | 'power-gym' | 'tree' | 'floating-island' | 'floating-island-with-waterfall' | 'crystal';
const palette: Record<GellyModelKind, number[]> = {
  snake: [0x195c48,0x3da64d,0x86c63e,0xadd64e],
  '2048-temple': [0x99512a,0xd58a31,0xf0b340,0xffd26a],
  'tetris-factory': [0x422a81,0x733bc2,0x9a4add,0xdf58d1],
  'power-gym': [0x822c39,0xbe443b,0xe87a33,0xffbe45],
  tree: [0x855039,0x995e43,0x24836f,0x68c879],
  'floating-island': [0x453365,0x684b8b,0x477954,0x7bd675],
  'floating-island-with-waterfall': [0x433660,0x5e589e,0x379fb9,0x78d1a0],
  crystal: [0x3434ae,0x574fe2,0x43bfff,0xabf5ff],
};

/** Loads only optimized exports, with a procedural placeholder until ready. */
export function mountGellyModel(parent: THREE.Group, kind: GellyModelKind, height: number, fallback?: THREE.Object3D, onLoaded?: () => void): void {
  const loader = new GLTFLoader();
  loader.load(`/assets/gelly/${kind}.glb`, gltf => {
    // The scene may have been destroyed while a request was in flight.
    if (parent.userData['disposed']) { disposeObject(gltf.scene); return; }
    const model=gltf.scene;
    const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    const factor=height/size.y;
    model.scale.setScalar(factor);
    model.position.set(-center.x*factor,-bounds.min.y*factor,-center.z*factor);
    const colors=palette[kind].map(c=>new THREE.Color(c));
    model.traverse(o=>{
      if(!(o instanceof THREE.Mesh))return;
      const geo=o.geometry as THREE.BufferGeometry;
      geo.computeBoundingBox();
      const box=geo.boundingBox!, pos=geo.getAttribute('position'),rgb=new Float32Array(pos.count*3);
      const color=new THREE.Color();
      for(let i=0;i<pos.count;i++){
        const t=THREE.MathUtils.clamp((pos.getY(i)-box.min.y)/(box.max.y-box.min.y),0,.999);
        const band=t*3,index=Math.floor(band);
        color.copy(colors[index]).lerp(colors[Math.min(index+1,3)],band-index);
        if(kind === 'tree' && t > .34) {
          const leafColor = new THREE.Color(parent.position.x < 0 ? 0x58c865 : 0x36b9bd);
          color.lerp(leafColor, .45);
        }
        if(kind === 'power-gym' && t > .66) color.set(0xffba27);
        // Gentle masonry variation keeps untextured sculpts from reading as plastic.
        const variation=.92+.08*Math.sin(Math.floor(pos.getX(i)*28)*13+Math.floor(pos.getY(i)*32)*7+Math.floor(pos.getZ(i)*28)*5);
        color.multiplyScalar(variation);color.toArray(rgb,i*3);
      }
      geo.setAttribute('color',new THREE.BufferAttribute(rgb,3));
      (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());
      o.material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:kind==='crystal'?.25:.62,metalness:.04});
      o.castShadow=true;o.receiveShadow=true;
    });
    if(fallback){parent.remove(fallback);disposeObject(fallback);}
    parent.add(model);
    onLoaded?.();
  },undefined,error=>console.warn(`[Gelly] ${kind} could not load; keeping fallback`,error));
}

export function disposeObject(root: THREE.Object3D): void {
  const geometry=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
  root.traverse(o=>{o.userData['disposed']=true;if(o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Line){geometry.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});
  geometry.forEach(g=>g.dispose());materials.forEach(m=>{
    for (const value of Object.values(m)) if (value instanceof THREE.Texture) value.dispose();
    m.dispose();
  });
}
