import * as THREE from 'three';

/** Short-lived ribbons and sparks in the doorway's vertical plane. */
export class GellyPortalVortex {
  readonly mesh = new THREE.Group();
  private readonly ribbons: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly sparks: THREE.Points;
  private readonly positions = new Float32Array(36 * 3);

  constructor(position: THREE.Vector3, color: number) {
    this.mesh.position.copy(position);
    for (let i = 0; i < 3; i++) {
      const ribbon = new THREE.Mesh(
        new THREE.TorusGeometry(1, .035 + i * .012, 6, 64, Math.PI * 1.5),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      ribbon.position.z = .06 * i;
      this.ribbons.push(ribbon);
      this.mesh.add(ribbon);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.sparks = new THREE.Points(geometry, new THREE.PointsMaterial({
      color, size: .12, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.sparks.frustumCulled = false;
    this.mesh.add(this.sparks);
  }

  update(t: number): void {
    const glow = Math.sin(Math.PI * t);
    this.ribbons.forEach((ribbon, i) => {
      ribbon.rotation.z = -t * t * 18 + i * Math.PI * 2 / 3;
      ribbon.scale.setScalar((1.1 + i * .22) * (1 - .8 * t));
      ribbon.material.opacity = glow * .85;
    });
    for (let i = 0; i < 36; i++) {
      const angle = i * 2.39996 - t * 17;
      const radius = (1.1 + (i % 7) * .16) * (1 - t);
      this.positions[i * 3] = Math.cos(angle) * radius;
      this.positions[i * 3 + 1] = Math.sin(angle) * radius;
      this.positions[i * 3 + 2] = .15 + (i % 5) * .15 * (1 - t);
    }
    this.sparks.geometry.attributes['position'].needsUpdate = true;
    (this.sparks.material as THREE.PointsMaterial).opacity = glow;
  }

  destroy(): void {
    this.mesh.removeFromParent();
    for (const ribbon of this.ribbons) { ribbon.geometry.dispose(); ribbon.material.dispose(); }
    this.sparks.geometry.dispose();
    (this.sparks.material as THREE.PointsMaterial).dispose();
  }
}
