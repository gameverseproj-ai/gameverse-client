import * as THREE from 'three';
import { HeroAction, HeroRenderer } from '../../shared/world/hero-renderer.interface';
import { WorldObstacle } from '../../shared/world/world-obstacle.model';

const SPEED = 8;
const TURN_SPEED = .85;
export type PlayerObstacle = WorldObstacle;

export class GellyPlayerController {
  readonly position: THREE.Vector3;
  private elapsedTime = 0;
  private velocity = new THREE.Vector2();
  heading = Math.PI;
  readonly eyes = new THREE.Vector3();
  private entry: { origin: THREE.Vector3; target: THREE.Vector3; heading: number } | null = null;

  setFirstPerson(active: boolean): void { this.heroRenderer.mesh.visible = !active; }

  private updateEyes(): void {
    if (this.heroRenderer.getEyePosition) this.heroRenderer.getEyePosition(this.eyes);
    else this.eyes.copy(this.position).add(new THREE.Vector3(0, 1.5, 0));
  }

  playAction(action: HeroAction): void { if (!this.entry) this.heroRenderer.playAction?.(action); }

  startPortalEntry(target: THREE.Vector3): void {
    if (this.entry) return;
    this.entry = { origin: this.position.clone(), target: target.clone(), heading: this.heading };
    this.velocity.set(0, 0);
    this.heroRenderer.mesh.visible = true;
    this.setFocused(false);
  }

  updatePortalEntry(progress: number): void {
    if (!this.entry) return;
    const t = THREE.MathUtils.clamp(progress, 0, 1);
    const pull = t * t * (3 - 2 * t);
    const angle = t * t * Math.PI * 8;
    const orbit = Math.sin(Math.PI * t) * (1 - t) * .85;
    this.position.lerpVectors(this.entry.origin, this.entry.target, pull);
    this.position.x += Math.sin(angle) * orbit;
    this.position.y += Math.sin(Math.PI * t) * .9;
    this.position.z += (Math.cos(angle) - 1) * orbit * .3;
    const mesh = this.heroRenderer.mesh;
    mesh.rotation.set(Math.sin(Math.PI * t) * .35, this.entry.heading + angle, Math.sin(angle) * .22);
    const shrink = Math.max(.001, 1 - Math.pow(t, 2));
    mesh.scale.set(shrink * (1 - .3 * Math.sin(Math.PI * t)), shrink * (1 + .6 * Math.sin(Math.PI * t)), shrink);
    mesh.visible = t < 1;
    this.updateEyes();
  }

  constructor(scene: THREE.Scene, private readonly heroRenderer: HeroRenderer, private readonly obstacles: PlayerObstacle[] = []) {
    this.heroRenderer.build(scene);
    this.heroRenderer.mesh.position.set(0, this.heroRenderer.spawnY, 8);
    this.position = this.heroRenderer.mesh.position;
    this.heroRenderer.mesh.rotation.y = this.heading;
    this.updateEyes();
  }

  setFocused(focused: boolean): void {
    this.heroRenderer.setFocused?.(focused);
  }

  update(delta: number, movement: { x: number; z: number }): void {
    if (this.entry) return;
    this.elapsedTime += delta;
    // Left/right steer, up/down move along the hero's heading in both views.
    const targetTurn = Math.max(-1, Math.min(1, movement.x)) * TURN_SPEED;
    this.heading -= targetTurn * delta;
    const forward = -movement.z;
    this.velocity.set(Math.sin(this.heading) * forward, Math.cos(this.heading) * forward);
    const x = this.position.x + this.velocity.x * SPEED * delta;
    if (!this.blocked(x, this.position.z)) this.position.x = x;
    const z = this.position.z + this.velocity.y * SPEED * delta;
    if (!this.blocked(this.position.x, z)) this.position.z = z;
    this.heroRenderer.update(delta, {x: this.velocity.x, z: this.velocity.y}, this.elapsedTime);
    this.heroRenderer.mesh.rotation.y = this.heading;
    this.updateEyes();
  }

  private blocked(x: number, z: number): boolean {
    return this.obstacles.some(o => {
      const depth = (px: number, pz: number) => Math.min(
        o.halfWidth + .65 - Math.abs(px - o.x),
        o.halfDepth + .65 - Math.abs(pz - o.z),
      );
      const nextDepth = depth(x, z);
      if (nextDepth <= 0) return false;
      // A model can finish loading around the player. Allow escape, never deeper entry.
      const currentDepth = depth(this.position.x, this.position.z);
      return currentDepth <= 0 || nextDepth >= currentDepth;
    });
  }

  destroy(): void {
    this.heroRenderer.destroy();
  }
}
