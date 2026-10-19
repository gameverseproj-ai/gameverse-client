import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TennisSport } from './tennis.api';
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
  private court = new T.Group();
  private sport: TennisSport = 'tennis';
  private readonly lastShuttlePosition = new T.Vector3();
  private readonly shuttleDirection = new T.Vector3();
  private readonly shuttleAxis = new T.Vector3(0, -1, 0);
  private shuttleTracked = false;
  private shuttle = new T.Group();
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
    this.scene.add(this.court);
    this.setSport('tennis');
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
    this.updateRackets();
    this.rival.rotation.y = Math.PI;
    this.scene.add(this.player, this.rival, this.ball, this.shuttle);
    const cork = new T.Mesh(
      new T.SphereGeometry(0.14, 12, 8),
      new T.MeshStandardMaterial({ color: 0xfff1b0 }),
    );
    this.shuttle.add(cork);
    const feathers = new T.Mesh(
      new T.ConeGeometry(0.32, 0.6, 12, 1, true),
      new T.MeshStandardMaterial({ color: 0xffffff, side: T.DoubleSide }),
    );
    feathers.rotation.z = Math.PI;
    feathers.position.y = 0.33;
    this.shuttle.add(feathers);

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
    parent: T.Object3D = this.scene,
  ): T.Mesh {
    const m = new T.Mesh(
      new RoundedBoxGeometry(...size, 2, radius),
      new T.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.18 }),
    );
    m.position.set(...pos);
    parent.add(m);
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
    racket.name = 'racket-rim';
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
    const handle = this.box([.09, .4, .09], [.7, .35, .2], 0x334657, .025, group);
    handle.name = 'racket-handle';
    strings.name = 'strings';
    strings.position.copy(racket.position);
    group.add(strings);
    for (const x of [-0.22, 0.22]) {
      const foot = new T.Mesh(new T.SphereGeometry(0.22, 12, 8), mat);
      foot.scale.set(1, 0.7, 1.5);
      foot.position.set(x, 0.18, 0.12);
      group.add(foot);
    }
  }
  private updateRackets(): void {
    const ping = this.sport === 'ping-pong';
    const squash = this.sport === 'squash';
    const badminton = this.sport === 'badminton';
    for (const robot of [this.player, this.rival]) {
      const rim = robot.getObjectByName('racket-rim');
      const strings = robot.getObjectByName('strings') as T.Mesh | undefined;
      const handle = robot.getObjectByName('racket-handle');
      if (!rim || !strings || !handle) continue;
      const width = ping ? .85 : badminton ? .8 : 1;
      const height = ping ? .9 : squash ? 1.45 : badminton ? 1.3 : 1.15;
      rim.scale.set(width, height, 1); strings.scale.copy(rim.scale);
      rim.position.y = strings.position.y = ping ? 1.65 : 1;
      handle.position.y = rim.position.y - .38 * height - .17;
      const material = strings.material as T.MeshBasicMaterial;
      material.wireframe = !ping; material.opacity = ping ? 1 : .45;
      material.color.setHex(ping ? 0xeb657e : badminton ? 0xffedb2 : 0x98c7ee);
    }
  }
  setSport(sport: TennisSport): void {
    this.sport = sport;
    this.shuttleTracked = false;
    this.updateRackets();
    this.court.traverse((o) => {
      const m = o as T.Mesh;
      m.geometry?.dispose();
      if (m.material)
        (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) =>
          x.dispose(),
        );
    });
    this.court.clear();
    const box = (
      size: [number, number, number],
      pos: [number, number, number],
      color: number,
      radius = 0.03,
    ) => this.box(size, pos, color, radius, this.court);
    const ping = sport === 'ping-pong',
      squash = sport === 'squash',
      badminton = sport === 'badminton';
    const floor = ping ? 1.25 : 0.16;
    box(
      [9.2, ping ? 0.22 : 0.08, ping ? 13 : 17],
      [0, floor - 0.06, 0],
      ping ? 0x263bb3 : squash ? 0x906b48 : badminton ? 0x287961 : 0x215a74,
    );
    if (ping)
      for (const x of [-3.6, 3.6])
        for (const z of [-5, 5]) box([0.35, 1.2, 0.35], [x, 0.6, z], 0x7b9cb2);
    const line = (w: number, d: number, x: number, z: number) =>
      box([w, 0.025, d], [x, floor + 0.03, z], 0xc9fff1, 0.005);
    for (const x of [-4.6, 4.6]) line(0.055, ping ? 13 : 17, x, 0);
    for (const z of ping ? [-6.5, 6.5] : [-8.5, 8.5, -4, 4])
      line(9.2, 0.055, 0, z);
    line(0.045, ping ? 13 : 8, 0, 0);
    if (squash) {
      box([10, 7, 0.3], [0, 3.5, -8.3], 0x233957, 0.12);
      for (const y of [0.4, 2.3, 6])
        box([9.5, 0.075, 0.06], [0, y, -8.1], y === 2.3 ? 0xffc363 : 0xfa627d);
      for (const side of [-1, 1]) {
        const wall = box([0.18, 6.8, 16.4], [side * 4.85, 3.4, -0.2], 0x71e9e6);
        const mat = wall.material as T.MeshStandardMaterial;
        mat.transparent = true;
        mat.opacity = 0.13;
        mat.depthWrite = false;
        box([0.08, 0.08, 16.4], [side * 4.85, 6, -0.2], 0xfa627d);
      }
      for (const side of [-1, 1]) {
        line(2, 0.05, side * 3.5, 3);
        line(0.05, 2, side * 2.5, 4);
      }
    } else {
      const net = ping ? 0.35 : badminton ? 1.4 : 1.1;
      for (const x of [-4.8, 4.8])
        box(
          [0.12, net + 0.2, 0.12],
          [x, floor + net / 2, 0],
          badminton ? 0xffcb71 : 0xdc91ff,
        );
      for (let x = -4.6; x <= 4.6; x += 0.35)
        box([0.014, net, 0.018], [x, floor + net / 2, 0], 0x71b4c8, 0.004);
      for (let y = 0.1; y <= net; y += 0.18)
        box([9.2, 0.014, 0.018], [0, floor + y, 0], 0x71b4c8, 0.004);
      box([9.5, 0.045, 0.045], [0, floor + net, 0], 0xf0f6ff, 0.01);
      if (badminton) for (const x of [-3.7, 3.7]) line(0.045, 17, x, 0);
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
    const squash = this.sport === 'squash';
    this.player.position.set(s.player, 0, squash ? 7.4 : (s.playerZ ?? 7));
    this.rival.position.set(s.opponent, 0, squash ? 6.6 : (s.opponentZ ?? -7));
    this.rival.rotation.y = squash ? 0 : Math.PI;
    const height =
      s.y ??
      (s.phase === 'rally'
        ? 0.45 + Math.sin(((s.z + 8.5) / 17) * Math.PI) * 1.5
        : 1.4);
    this.ball.visible = this.sport !== 'badminton';
    this.shuttle.visible = !this.ball.visible;
    this.ball.position.set(
      s.x,
      height + (this.sport === 'ping-pong' ? 1.25 : 0.16),
      s.z,
    );
    this.ball.material.color.setHex(
      this.sport === 'ping-pong' ? 0xffffff : squash ? 0x66baff : 0xeaff66,
    );
    this.ball.scale.setScalar(squash ? 0.7 : 1);
    this.shuttle.position.copy(this.ball.position);
    if (this.sport === 'badminton' && s.phase === 'rally' && this.shuttleTracked) {
      this.shuttleDirection.copy(this.shuttle.position).sub(this.lastShuttlePosition);
      if (this.shuttleDirection.lengthSq() > .000001) {
        this.shuttle.quaternion.setFromUnitVectors(this.shuttleAxis, this.shuttleDirection.normalize());
      }
    } else this.shuttle.rotation.set(0, 0, 0);
    this.lastShuttlePosition.copy(this.shuttle.position);
    this.shuttleTracked = this.sport === 'badminton' && s.phase === 'rally';
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
