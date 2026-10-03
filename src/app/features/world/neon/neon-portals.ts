import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GamePortal } from '../../../shared/world/game-portal.model';

/** Exactly one reserved entrance. No game route or bootstrap exists yet. */
export const NEON_PORTALS: GamePortal[] = [{
  id: 'neon-pending', name: 'Coming soon', route: '', available: false,
  position: [0, 0, -20], scale: [12, 11, 5], color: 0x49efff,
  buildGroup: () => {
    const group = new THREE.Group();
    const shell = new THREE.MeshStandardMaterial({ color: 0x778da7, metalness: .12, roughness: .55, emissive: 0x2b425c, emissiveIntensity: .3 });
    const cyan = new THREE.MeshBasicMaterial({ color: 0x4cf1ff });
    const pink = new THREE.MeshBasicMaterial({ color: 0xf15aff });
    const box = (size: [number, number, number], position: [number, number, number], material: THREE.Material) => {
      const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 3, Math.min(.35, ...size.map(value => value / 3))), material);
      mesh.position.set(...position); mesh.castShadow = true; group.add(mesh); return mesh;
    };
    box([12, .35, 7], [0, .18, 0], shell);
    box([12, .06, .12], [0, .39, 3.5], cyan);
    for (const side of [-1, 1]) {
      box([2, 5.5, 4], [side * 4.8, 2.75, 0], shell);
      box([.14, 5, .15], [side * 4, 2.8, 2.08], side < 0 ? cyan : pink);
      box([2.3, .35, 4.3], [side * 4.8, .45, 0], shell);
    }
    // A rounded arch replaces the rectangular gantry.
    const arch = new THREE.Mesh(new THREE.TorusGeometry(4.8, 1, 12, 40, Math.PI), shell);
    arch.position.set(0,5.5,0); arch.scale.z=2; group.add(arch);
    const trim = new THREE.Mesh(new THREE.TorusGeometry(4, .08, 8, 40, Math.PI), pink);
    trim.position.set(0,5.5,2.08); group.add(trim);
    const shutter = new THREE.Shape();
    shutter.moveTo(-3.8,0); shutter.lineTo(3.8,0); shutter.lineTo(3.8,5.1);
    shutter.absarc(0,5.1,3.8,0,Math.PI,false); shutter.lineTo(-3.8,0);
    const door=new THREE.Mesh(new THREE.ExtrudeGeometry(shutter,{depth:.25,bevelEnabled:true,bevelSize:.08,bevelThickness:.05,bevelSegments:3,steps:1}),shell);
    door.position.set(0,.4,1.8); group.add(door);
    for (let i=0;i<9;i++) {
      const y=.8+i, halfWidth=y<=5.5?3.7:Math.sqrt(Math.max(0,3.7**2-(y-5.5)**2));
      box([halfWidth*2,.045,.05],[0,y,2.12],i%2?cyan:pink);
    }
    const badge = new THREE.Mesh(new THREE.IcosahedronGeometry(.65, 1), pink);
    badge.position.set(0, 10.9, 0); badge.userData['spin'] = .35; badge.userData['floatY'] = 10.9; group.add(badge);
    // A geometric lock reads without adding a wall of text to the scene.
    box([1.2, .9, .2], [0, 5, 2.4], cyan);
    const lock = new THREE.Mesh(new THREE.TorusGeometry(.4, .09, 8, 24, Math.PI), cyan);
    lock.position.set(0, 5.45, 2.4); group.add(lock);
    return group;
  },
}];
