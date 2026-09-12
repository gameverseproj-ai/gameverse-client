import * as THREE from 'three';

export type HeroAction = 'jump' | 'wave';

export interface HeroRenderer {
  readonly mesh: THREE.Group;
  /** World-space Y of the hero's center at rest on flat ground (= visual radius). */
  readonly spawnY: number;
  build(scene: THREE.Scene): void;
  update(delta: number, movement: { x: number; z: number }, elapsedTime: number): void;
  /** Pulse a focus glow when the hero is targeting a nearby portal. */
  setFocused?(focused: boolean): void;
  getEyePosition?(target: THREE.Vector3): void;
  playAction?(action: HeroAction): void;
  destroy(): void;
}
