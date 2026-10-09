import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { MatchState } from './tennis-match';

export class TennisScene {
  private scene = new T.Scene();
  private camera = new T.PerspectiveCamera(43, 1, 0.1, 150);
  private renderer: T.WebGLRenderer;
  private player = new T.Group();
  private rival = new T.Group();
  private ball = new T.Mesh(
    new T.SphereGeometry(0.17, 16, 12),
    new T.MeshStandardMaterial({
      color: 0xeaff66,
      emissive: 0x6eaa18,
      emissiveIntensity: 0.6,
    }),
  );
  private particles: T.Points;
  private disposed = false;
  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.setClearColor(0x0a1226);
    this.scene.fog = new T.FogExp2(0x0a1226, 0.012);
    this.scene.add(new T.HemisphereLight(0xd4faff, 0x403659, 2.8));
    const sun = new T.DirectionalLight(0xffe4c4, 3);
    sun.position.set(8, 18, 6);
    this.scene.add(sun);
    this.camera.position.set(0, 19, 23);
    this.camera.lookAt(0, 0, 0);
    this.box([16, 1, 25], [0, -0.65, 0], 0x283552, 0.45);
    this.box([15.4, 0.08, 24.4], [0, -0.1, 0], 0x3dd4d8, 0.18);
    this.box([15, 0.12, 24], [0, 0, 0], 0x162c49, 0.25);
    this.box([10, 0.08, 17], [0, 0.1, 0], 0x215a74, 0.03);
    const line = (w: number, d: number, x: number, z: number) =>
      this.box([w, 0.025, d], [x, 0.16, z], 0xc9fff1, 0.01);
    for (const x of [-5, 5]) line(0.06, 17, x, 0);
    for (const z of [-8.5, 8.5, -4, 4]) line(10, 0.06, 0, z);
    line(0.06, 8, 0, 0);
    for (const x of [-3.8, 3.8]) line(0.04, 17, x, 0);
    // Transparent mesh and luminous posts leave the court readable.
    for (const x of [-5.5, 5.5])
      this.box([0.15, 1.4, 0.15], [x, 0.7, 0], 0xdc91ff, 0.04);
    for (let x = -5.4; x <= 5.4; x += 0.3)
      this.box([0.012, 1.1, 0.018], [x, 0.6, 0], 0x71b4c8, 0.004);
    for (let y = 0.15; y <= 1.2; y += 0.18)
      this.box([10.8, 0.012, 0.018], [0, y, 0], 0x71b4c8, 0.004);
    this.box([11, 0.065, 0.065], [0, 1.22, 0], 0xf0f6ff, 0.015);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++)
        this.box(
          [2.2, 0.65 + i * 0.45, 19],
          [side * (9 + i * 1.6), i * 0.225, -1],
          i % 2 ? 0x34446e : 0x263b5c,
          0.25,
        );
      for (const z of [-9, 9]) {
        this.box([0.2, 7, 0.2], [side * 7, 3.5, z], 0x6e8eaf, 0.08);
        this.box([2, 0.15, 0.4], [side * 7, 7, z], 0xc9faff, 0.06);
        const l = new T.PointLight(side < 0 ? 0x47e4ef : 0xce71ff, 18, 20);
        l.position.set(side * 7, 5, z);
        this.scene.add(l);
      }
      for (let i = 0; i < 5; i++) {
        const island = new T.Mesh(
          new T.IcosahedronGeometry(2 + (i % 2), 0),
          new T.MeshStandardMaterial({ color: 0x303d66, roughness: 0.7 }),
        );
        island.position.set(side * (19 + i * 3), -3 + (i % 3), -20 + i * 8);
        island.scale.y = 0.6;
        this.scene.add(island);
        const crystal = new T.Mesh(
          new T.OctahedronGeometry(0.9, 0),
          new T.MeshStandardMaterial({
            color: side < 0 ? 0x6af6e4 : 0xc098ff,
            emissive: 0x23355d,
            metalness: 0.5,
            roughness: 0.2,
          }),
        );
        crystal.position.copy(island.position).add(new T.Vector3(0, 2, 0));
        this.scene.add(crystal);
      }
    }
    this.robot(this.player, 0x6de9dc);
    this.robot(this.rival, 0xffb477);
    this.rival.rotation.y = Math.PI;
    this.scene.add(this.player, this.rival, this.ball);
    const stars = new Float32Array(90 * 3);
    for (let i = 0; i < 90; i++) {
      stars[i * 3] = Math.sin(i * 17) * 45;
      stars[i * 3 + 1] = 4 + (i % 13) * 1.7;
      stars[i * 3 + 2] = Math.cos(i * 13) * 45;
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(stars, 3));
    this.particles = new T.Points(
      g,
      new T.PointsMaterial({ color: 0xb9c7fc, size: 0.065 }),
    );
    this.scene.add(this.particles);
  }
  private box(
    size: [number, number, number],
    pos: [number, number, number],
    color: number,
    radius: number,
  ): T.Mesh {
    const m = new T.Mesh(
      new RoundedBoxGeometry(...size, 2, radius),
      new T.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.18 }),
    );
    m.position.set(...pos);
    this.scene.add(m);
    return m;
  }
  private robot(group: T.Group, color: number): void {
    const mat = new T.MeshStandardMaterial({
      color,
      roughness: 0.3,
      metalness: 0.35,
    });
    const body = new T.Mesh(new T.CapsuleGeometry(0.34, 0.5, 5, 12), mat);
    body.position.y = 0.75;
    group.add(body);
    const head = new T.Mesh(new T.SphereGeometry(0.4, 20, 16), mat);
    head.position.y = 1.5;
    group.add(head);
    const visor = new T.Mesh(
      new RoundedBoxGeometry(0.55, 0.17, 0.13, 2, 0.05),
      new T.MeshBasicMaterial({ color: 0x10172b }),
    );
    visor.position.set(0, 1.54, 0.33);
    group.add(visor);
    for (const x of [-0.14, 0.14]) {
      const eye = new T.Mesh(
        new T.SphereGeometry(0.05, 8, 8),
        new T.MeshBasicMaterial({ color: 0xffffff }),
      );
      eye.position.set(x, 1.54, 0.41);
      group.add(eye);
    }
    const racket = new T.Mesh(
      new T.TorusGeometry(0.38, 0.045, 8, 24),
      new T.MeshStandardMaterial({
        color: 0xedeeff,
        metalness: 0.65,
        roughness: 0.2,
      }),
    );
    racket.position.set(0.7, 0.85, 0.2);
    group.add(racket);
    const strings = new T.Mesh(
      new T.CircleGeometry(0.33, 24),
      new T.MeshBasicMaterial({
        color: 0x98c7ee,
        wireframe: true,
        transparent: true,
        opacity: 0.45,
        side: T.DoubleSide,
      }),
    );
    strings.position.copy(racket.position);
    group.add(strings);
    for (const x of [-0.22, 0.22]) {
      const foot = new T.Mesh(new T.SphereGeometry(0.22, 12, 8), mat);
      foot.scale.set(1, 0.7, 1.5);
      foot.position.set(x, 0.18, 0.12);
      group.add(foot);
    }
  }
  resize(w: number, h: number): void {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.position.set(0, w / h < 0.8 ? 25 : 19, w / h < 0.8 ? 30 : 23);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }
  render(s: MatchState, time: number): void {
    if (this.disposed) return;
    this.player.position.set(s.player, 0, 7);
    this.rival.position.set(s.opponent, 0, -7);
    this.ball.position.set(
      s.x,
      s.phase === 'rally'
        ? 0.45 + Math.sin(((s.z + 8.5) / 17) * Math.PI) * 1.5
        : 1.4,
      s.z,
    );
    this.ball.rotation.x = time * 3;
    this.particles.rotation.y = time * 0.006;
    this.renderer.render(this.scene, this.camera);
  }
  destroy(): void {
    this.disposed = true;
    this.scene.traverse((o) => {
      const m = o as T.Mesh;
      if (m.geometry) m.geometry.dispose();
      const materials = m.material
        ? Array.isArray(m.material)
          ? m.material
          : [m.material]
        : [];
      materials.forEach((x) => x.dispose());
    });
    this.renderer.dispose();
  }
}
