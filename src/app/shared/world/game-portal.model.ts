import * as THREE from 'three';

export interface GamePortal {
  readonly id: string;
  readonly name: string;
  readonly available?: boolean;
  readonly route: string;
  readonly position: [number, number, number];
  /** [width, height, depth] — used for label placement and proximity radius */
  readonly scale: [number, number, number];
  readonly color: number;
  /** World-space offset from building centre to the entrance. Defaults to the south face. */
  readonly entranceOffset?: [number, number];
  /** Build and return the Three.js Group that represents this portal in the world. */
  buildGroup(): THREE.Group;
  /** Called once when the player enters proximity. Animate the group however the world wants. */
  onApproach?(group: THREE.Group): void;
  /** Called once when the player leaves proximity. Restore the group to resting state. */
  onDepart?(group: THREE.Group): void;
  /** Populate the CSS2D label div. Falls back to plain textContent if absent. */
  buildLabel?(container: HTMLDivElement): void;
}

export function portalEntrance(portal: GamePortal): THREE.Vector3 {
  const [x,z]=portal.entranceOffset ?? [0,portal.scale[2]/2];
  return new THREE.Vector3(portal.position[0]+x,0,portal.position[2]+z);
}
export function portalFacing(portal: GamePortal): THREE.Vector3 {
  const [x,z]=portal.entranceOffset ?? [0,1];
  return new THREE.Vector3(x,0,z).normalize();
}
