import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GamePortal } from '../../../shared/world/game-portal.model';

/** Compact racquet club: the existing entrance footprint, with Jelly-style readable architecture. */
export const NEON_PORTALS: GamePortal[] = [{
  id: 'tennis', name: 'Tennis Island', route: '/games/tennis', available: true,
  position: [0, 0, -20], scale: [12, 11, 5], color: 0x49efff,
  buildGroup: () => {
    const group = new THREE.Group();
    const shell = new THREE.MeshStandardMaterial({ color: 0x778da7, metalness: .08, roughness: .6 });
    const teal = new THREE.MeshStandardMaterial({ color: 0x245366, roughness: .7 });
    const cyan = new THREE.MeshBasicMaterial({ color: 0x4cf1ff });
    const violet = new THREE.MeshBasicMaterial({ color: 0xb777ff });
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = group) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
      parent.add(mesh); return mesh;
    };
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material = shell) =>
      add(new RoundedBoxGeometry(w, h, d, 3, Math.min(.22, w / 3, h / 3, d / 3)), material, x, y, z);
    const archShape = (radius: number, spring: number, bottom: number) => {
      const shape = new THREE.Shape();
      shape.moveTo(-radius, bottom); shape.lineTo(-radius, spring);
      shape.absarc(0, spring, radius, Math.PI, 0, true);
      shape.lineTo(radius, bottom); shape.closePath(); return shape;
    };
    box(12, .4, 7, 0, .2, 0);
    box(11.8, .18, 6.8, 0, .1, 0, teal);
    // Solid shallow arched body, inset behind the structural frame.
    add(new THREE.ExtrudeGeometry(archShape(4.4, 5, .4), {
      depth: 3.5, bevelEnabled: true, bevelThickness: .12, bevelSize: .12, bevelSegments: 2, steps: 1,
    }), teal, 0, 0, -2);
    for (const side of [-1, 1]) {
      box(2.25, 4.7, 4.6, side * 4.65, 2.85, 0);
      box(2.5, .55, 4.9, side * 4.65, .65, 0);
      box(2.5, .65, 4.9, side * 4.65, 5.05, 0, teal);
      box(.55, 3.5, .16, side * 4.65, 2.9, 2.36, teal);
      box(.16, 2.9, .12, side * 4.65, 2.9, 2.48, cyan);
    }
    // Broad segmented arch: small seams give the same chunky masonry rhythm as Jelly halls.
    for (let i = 0; i < 7; i++) {
      const arch = add(new THREE.TorusGeometry(4.65, .67, 8, 8, Math.PI / 7 - .016), shell, 0, 5.15, 0);
      arch.rotation.z = i * Math.PI / 7 + .008; arch.scale.z = 3.3;
    }
    // The portal sits in front of the wall; its animated surface uses the world's existing clock.
    const energy = new THREE.ShaderMaterial({
      uniforms: { t: { value: 0 } },
      vertexShader: 'varying vec2 p; void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform float t; varying vec2 p; void main(){float r=length((p-vec2(0.,2.))/vec2(1.4,2.));float wave=.5+.5*sin(r*19.-t*2.);gl_FragColor=vec4(vec3(.08,.72,.85)+vec3(.08,.18,.15)*wave,1.);}',
    });
    const door = add(new THREE.ShapeGeometry(archShape(1.25, 2.65, .55)), energy, 0, 0, 2.05);
    door.userData['portalSurface'] = true;
    for (const side of [-1, 1]) {
      box(.55, 2.15, .65, side * 1.52, 1.63, 2.12);
      box(.09, 2.1, .08, side * 1.23, 1.62, 2.49, cyan);
    }
    add(new THREE.TorusGeometry(1.52, .28, 10, 28, Math.PI), shell, 0, 2.65, 2.12);
    add(new THREE.TorusGeometry(1.25, .045, 6, 28, Math.PI), cyan, 0, 2.65, 2.49);
    box(4.5, .18, 1.3, 0, .47, 2.8);
    box(3.8, .18, .95, 0, .62, 2.65);
    // Crossed oval rackets with real string geometry, rather than a flat texture.
    for (const side of [-1, 1]) {
      const racket = new THREE.Group();
      racket.position.set(side * .7, 6.65, 2.12); racket.rotation.z = -side * .48; group.add(racket);
      const rim = add(new THREE.TorusGeometry(.73, .1, 8, 28), shell, 0, 0, 0, racket); rim.scale.y = 1.3;
      const light = add(new THREE.TorusGeometry(.62, .035, 6, 28), cyan, 0, 0, .08, racket); light.scale.y = 1.3;
      for (const offset of [-.4, -.2, 0, .2, .4]) {
        const vertical = 2 * .8 * Math.sqrt(1 - (offset / .62) ** 2);
        add(new THREE.CylinderGeometry(.015, .015, vertical, 4), cyan, offset, 0, .04, racket);
        const horizontal = 2 * .62 * Math.sqrt(1 - (offset / .8) ** 2);
        const string = add(new THREE.CylinderGeometry(.015, .015, horizontal, 4), cyan, 0, offset, .04, racket);
        string.rotation.z = Math.PI / 2;
      }
      add(new THREE.CylinderGeometry(.09, .09, 1.3, 10), shell, 0, -1.45, 0, racket);
      add(new THREE.CylinderGeometry(.14, .14, .55, 10), teal, 0, -1.8, 0, racket);
    }
    add(new THREE.CylinderGeometry(.65, .75, .25, 24), shell, 0, 10, 0);
    const badge = add(new THREE.OctahedronGeometry(.38), violet, 0, 10.5, 0);
    badge.scale.y = 1.2; badge.userData['spin'] = .35; badge.userData['floatY'] = 10.5;
    return group;
  },
}];
