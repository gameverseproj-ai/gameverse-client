import * as THREE from 'three';
import { HeroRenderer } from '../../shared/world/hero-renderer.interface';

const SPEED = 8;

export class GellyPlayerController {
  readonly position: THREE.Vector3;
  private elapsedTime = 0;

  constructor(scene: THREE.Scene, private readonly heroRenderer: HeroRenderer) {
    this.heroRenderer.build(scene);
    this.heroRenderer.mesh.position.set(0, 1, 8);
    this.position = this.heroRenderer.mesh.position;
  }

  update(delta: number, movement: { x: number; z: number }): void {
    this.elapsedTime += delta;
    this.position.x += movement.x * SPEED * delta;
    this.position.z += movement.z * SPEED * delta;
    this.heroRenderer.update(delta, movement, this.elapsedTime);
  }

  destroy(): void {
    this.heroRenderer.destroy();
  }
}
