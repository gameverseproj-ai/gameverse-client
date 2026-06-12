import * as THREE from 'three';
import { HeroRenderer } from '../../../shared/world/hero-renderer.interface';

const BASE_Y = 1;
const HOP_FREQ = 6;
const HOP_AMP = 0.5;
const BOB_AMP = 0.08;
const BOB_FREQ = 2;
const SCALE_LERP = 0.14;

export class GellyHeroRenderer implements HeroRenderer {
  readonly mesh: THREE.Group;
  private body!: THREE.Mesh;

  constructor() {
    this.mesh = new THREE.Group();
  }

  build(scene: THREE.Scene): void {
    const bodyMat = new THREE.MeshPhongMaterial({
      color: 0xff6eb4,
      emissive: 0x3a0020,
      shininess: 140,
      specular: 0xffffff,
    });
    this.body = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), bodyMat);
    this.body.castShadow = true;
    this.mesh.add(this.body);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a0010 });
    const eyeGeo = new THREE.SphereGeometry(0.13, 12, 12);

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.3, 0.28, 0.93);
    this.mesh.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.3, 0.28, 0.93);
    this.mesh.add(rightEye);

    const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), shineMat);
    shine.position.set(0.35, 0.55, 0.82);
    this.mesh.add(shine);

    scene.add(this.mesh);
  }

  update(delta: number, movement: { x: number; z: number }, elapsedTime: number): void {
    const speed = Math.sqrt(movement.x ** 2 + movement.z ** 2);

    if (speed > 0.01) {
      // Bounce: cusped parabola — squash at ground contact, stretch at peak
      const bounce = Math.abs(Math.sin(elapsedTime * HOP_FREQ));
      this.mesh.position.y = BASE_Y + bounce * HOP_AMP;
      this.body.scale.y += (0.65 + bounce * 0.65 - this.body.scale.y) * SCALE_LERP;
      this.body.scale.x += (1.35 - bounce * 0.35 - this.body.scale.x) * SCALE_LERP;
      this.body.scale.z += (1.35 - bounce * 0.35 - this.body.scale.z) * SCALE_LERP;
      this.mesh.rotation.y = Math.atan2(movement.x, movement.z);
    } else {
      this.mesh.position.y = BASE_Y + Math.sin(elapsedTime * BOB_FREQ) * BOB_AMP;
      this.body.scale.x += (1 - this.body.scale.x) * SCALE_LERP;
      this.body.scale.y += (1 - this.body.scale.y) * SCALE_LERP;
      this.body.scale.z += (1 - this.body.scale.z) * SCALE_LERP;
    }
  }

  destroy(): void {}
}
