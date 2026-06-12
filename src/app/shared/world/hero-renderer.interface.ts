import * as THREE from 'three';

export interface HeroRenderer {
  readonly mesh: THREE.Group;
  build(scene: THREE.Scene): void;
  update(delta: number, movement: { x: number; z: number }, elapsedTime: number): void;
  destroy(): void;
}
