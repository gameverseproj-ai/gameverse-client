import * as THREE from 'three';

export interface GamePortal {
  readonly id: string;
  readonly name: string;
  readonly route: string;
  readonly position: [number, number, number];
  /** [width, height, depth] — used for label placement and proximity radius */
  readonly scale: [number, number, number];
  readonly color: number;
  /** Build and return the Three.js Group that represents this portal in the world. */
  buildGroup(): THREE.Group;
}
