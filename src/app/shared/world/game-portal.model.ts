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
  /** Called once when the player enters proximity. Animate the group however the world wants. */
  onApproach?(group: THREE.Group): void;
  /** Called once when the player leaves proximity. Restore the group to resting state. */
  onDepart?(group: THREE.Group): void;
  /** Populate the CSS2D label div. Falls back to plain textContent if absent. */
  buildLabel?(container: HTMLDivElement): void;
}
