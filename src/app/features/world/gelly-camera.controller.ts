import * as THREE from 'three';

export type CameraMode = 'first-person' | 'third-person';

/** Follow the hero with a damped, rate-limited third-person orbit. */
export class GellyCameraController {
  readonly camera: THREE.PerspectiveCamera;
  mode: CameraMode = 'third-person';
  private readonly target = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3();
  private readonly anchor = new THREE.Vector3();
  private boomDistance = 9;
  private yaw = Math.PI;
  private orbitOffset = 0;
  private pitchOffset = 0;

  orbit(deltaX: number, deltaY: number): void {
    this.orbitOffset -= deltaX * .003;
    this.orbitOffset = Math.atan2(Math.sin(this.orbitOffset), Math.cos(this.orbitOffset));
    this.pitchOffset = THREE.MathUtils.clamp(this.pitchOffset + deltaY * .003, -.25, .55);
  }
  private readonly ray = new THREE.Raycaster();
  private readonly pivot = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private collisionObjects: THREE.Object3D[] = [];

  setCollisionObjects(objects: THREE.Object3D[]): void { this.collisionObjects = objects; }

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(62, aspect, .06, 400);
    this.resize(aspect);
  }

  setMode(mode: CameraMode): void { this.mode = mode; }

  init(position: THREE.Vector3, heading = Math.PI, eyes = position.clone().add(new THREE.Vector3(0, 1.5, 0))): void {
    this.yaw = heading;
    this.anchor.copy(position);
    this.update(position, heading, eyes, 1, true);
  }

  update(position: THREE.Vector3, heading: number, eyes: THREE.Vector3, delta: number, snap = false): void {
    const dt = Math.min(.25, Math.max(0, delta));
    heading += this.orbitOffset;
    if (snap || this.mode === 'first-person') this.yaw = heading;
    else {
      // Shortest arc across ±PI; only the camera is damped, never input.
      const difference = Math.atan2(Math.sin(heading - this.yaw), Math.cos(heading - this.yaw));
      const turn = difference * (1 - Math.exp(-8 * dt));
      this.yaw += THREE.MathUtils.clamp(turn, -.95 * dt, .95 * dt);
    }
    const sx = Math.sin(this.yaw), sz = Math.cos(this.yaw);
    if (this.mode === 'first-person') {
      this.camera.position.copy(eyes);
      this.lookTarget.set(eyes.x + sx * 10, eyes.y - Math.tan(this.pitchOffset) * 10, eyes.z + sz * 10);
    } else {
      if (snap) this.anchor.copy(position);
      else this.anchor.lerp(position, 1 - Math.exp(-14 * dt));
      this.target.set(this.anchor.x - sx * Math.cos(this.pitchOffset) * 8.5, this.anchor.y + 4.5 + Math.sin(this.pitchOffset) * 8.5, this.anchor.z - sz * Math.cos(this.pitchOffset) * 8.5);
      this.camera.position.copy(this.target);
      this.lookTarget.set(this.anchor.x + sx * 2, this.anchor.y + 1.8, this.anchor.z + sz * 2);
    }
    if (this.mode === 'third-person') {
      this.pivot.copy(this.anchor).y += 1.8;
      this.direction.copy(this.camera.position).sub(this.pivot);
      const distance = this.direction.length();
      this.ray.set(this.pivot, this.direction.normalize());
      this.ray.far = distance;
      const hit = this.ray.intersectObjects(this.collisionObjects, true)[0];
      const safeDistance = hit ? Math.max(.35, hit.distance - .35) : distance;
      // Move inward for safety; ease outward to avoid a sudden zoom after a wall.
      if (snap || safeDistance < this.boomDistance) this.boomDistance = safeDistance;
      else this.boomDistance += (safeDistance - this.boomDistance) * (1 - Math.exp(-4 * dt));
      this.camera.position.copy(this.pivot).addScaledVector(this.direction, this.boomDistance);
    }
    this.camera.lookAt(this.lookTarget);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
