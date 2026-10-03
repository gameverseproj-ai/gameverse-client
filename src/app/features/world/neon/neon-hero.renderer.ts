import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { HeroAction, HeroRenderer } from '../../../shared/world/hero-renderer.interface';
import { disposeObject } from '../gelly/gelly-models';

/** A simple hovering robot with a luminous visor and articulated hands. */
export class NeonHeroRenderer implements HeroRenderer {
  readonly mesh = new THREE.Group();
  readonly spawnY = .12;
  private readonly body = new THREE.Group();
  private readonly hands: THREE.Group[] = [];
  private readonly eyes: THREE.Mesh[] = [];
  private readonly halo = new THREE.Mesh(new THREE.RingGeometry(.7, .8, 48),
    new THREE.MeshBasicMaterial({ color: 0x35efff, transparent: true, opacity: .45, side: THREE.DoubleSide }));
  private jump = -1;
  private wave = -1;
  private focused = false;

  build(scene: THREE.Scene): void {
    // A pale, mostly diffuse shell stays legible without an environment map.
    // Gentle emission preserves the silhouette on the unlit side and on mobile.
    const shell = new THREE.MeshStandardMaterial({
      color: 0xb9dfed, metalness: .12, roughness: .48,
      emissive: 0x488ba6, emissiveIntensity: .38,
    });
    const dark = new THREE.MeshStandardMaterial({ color: 0x030b1b, metalness: .4, roughness: .2 });
    const cyan = new THREE.MeshBasicMaterial({ color: 0x62faff });
    const pink = new THREE.MeshBasicMaterial({ color: 0xff55cd });
    const box = (parent: THREE.Object3D, size: [number, number, number], at: [number, number, number], mat: THREE.Material) => {
      const part = new THREE.Mesh(new RoundedBoxGeometry(...size, 3, .1), mat);
      part.position.set(...at); part.castShadow = true; parent.add(part); return part;
    };
    this.mesh.add(this.body);
    box(this.body, [1.75, 1.55, 1.25], [0, 1.7, 0], shell);
    box(this.body, [1.5, .95, .1], [0, 1.78, .65], cyan);
    box(this.body, [1.39, .84, .12], [0, 1.78, .69], dark);
    for (const side of [-1, 1]) {
      this.eyes.push(box(this.body, [.16, .32, .08], [side * .32, 1.85, .78], cyan));
      const hand = new THREE.Group(); hand.position.set(side * 1.05, 1.55, 0); this.body.add(hand);
      box(hand, [.32, .65, .45], [0, -.2, 0], shell);
      box(hand, [.34, .12, .47], [0, -.36, 0], pink); this.hands.push(hand);
    }
    box(this.body, [.28, .06, .08], [0, 1.54, .78], cyan);
    box(this.body, [1.2, .12, .7], [0, 1.04, 0], cyan);
    box(this.body, [.09, .35, .09], [0, 2.57, 0], shell);
    const antenna = new THREE.Mesh(new THREE.OctahedronGeometry(.17), pink);
    antenna.position.y = 2.83; this.body.add(antenna);
    // Shoulder and rear trims remain visible from the following camera.
    box(this.body, [1.45, .08, .06], [0, 2.31, -.65], cyan);
    for (const side of [-1, 1]) {
      box(this.body, [.07, 1.08, .06], [side * .76, 1.72, -.65], cyan);
    }
    // Rear power core keeps the silhouette readable from the following camera.
    box(this.body, [.56, .56, .1], [0, 1.7, -.65], cyan);
    box(this.body, [.32, .32, .12], [0, 1.7, -.7], dark);
    this.halo.rotation.x = -Math.PI / 2; this.halo.position.y = .03;
    this.mesh.add(this.halo); scene.add(this.mesh);
  }

  update(delta: number, movement: { x: number; z: number }, time: number): void {
    const moving = Math.min(1, Math.hypot(movement.x, movement.z));
    let lift = 0;
    if (this.jump >= 0) { this.jump += delta; lift = Math.sin(Math.min(1, this.jump / .8) * Math.PI) * 2.5; if (this.jump >= .8) this.jump = -1; }
    this.body.position.y = Math.sin(time * 2.4) * .12 + lift;
    this.body.rotation.x = THREE.MathUtils.damp(this.body.rotation.x, moving * .13, 8, delta);
    this.hands.forEach((hand, i) => { hand.rotation.z = (i ? -1 : 1) * (.12 + moving * .25); hand.rotation.x = Math.sin(time * 8 + i * Math.PI) * moving * .3; });
    if (this.wave >= 0) { this.wave += delta; this.hands[1].rotation.z = -2.3 + Math.sin(this.wave * 18) * .3; if (this.wave > 1.5) this.wave = -1; }
    const blink = time % 5 > 4.85 ? .12 : 1;
    this.eyes.forEach(eye => eye.scale.y = blink);
    this.halo.scale.setScalar(1 + Math.sin(time * 3) * .08 + lift * .1);
    this.halo.material.opacity = (this.focused ? .75 : .4) - lift * .07;
  }
  playAction(action: HeroAction): void { if (action === 'jump' && this.jump < 0) this.jump = 0; if (action === 'wave') this.wave = 0; }
  setFocused(focused: boolean): void { this.focused = focused; }
  getEyePosition(target: THREE.Vector3): void { this.body.updateWorldMatrix(true, false); target.set(0, 1.85, .8); this.body.localToWorld(target); }
  destroy(): void { disposeObject(this.mesh); this.mesh.removeFromParent(); }
}
