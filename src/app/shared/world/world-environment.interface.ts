import * as THREE from 'three';
import { WorldObstacle } from './world-obstacle.model';

export interface WorldEnvironment {
  readonly obstacles?: readonly WorldObstacle[];
  build(scene: THREE.Scene): void;
  update(elapsedTime: number, delta: number): void;
  destroy(): void;
}
