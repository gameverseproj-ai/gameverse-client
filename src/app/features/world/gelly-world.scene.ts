import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import gsap from 'gsap';
import { GellyInputController } from './gelly-input.controller';
import { GellyPlayerController } from './gelly-player.controller';
import { GamePortal } from '../../shared/world/game-portal.model';
import { HeroRenderer } from '../../shared/world/hero-renderer.interface';
import { WorldTheme } from '../../shared/world/world-theme.model';

const INTERACT_RADIUS = 7;
const CAM_HEIGHT = 5;
const CAM_DIST = 8;

export class GellyWorldScene {
  readonly input: GellyInputController;

  private renderer!: THREE.WebGLRenderer;
  private css2dRenderer!: CSS2DRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private player!: GellyPlayerController;
  private clock = new THREE.Clock();
  private rafId = 0;
  private nearbyPortal: GamePortal | null = null;
  private readonly portalGroups = new Map<string, THREE.Group>();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly container: HTMLElement,
    private readonly onNearPortal: (p: GamePortal | null) => void,
    private readonly onEnterPortal: (p: GamePortal) => void,
    private readonly theme: WorldTheme,
    private readonly portals: GamePortal[],
    heroRenderer: HeroRenderer,
  ) {
    this.input = new GellyInputController(() => this.handleInteract());
    this.init(heroRenderer);
  }

  private init(heroRenderer: HeroRenderer): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    console.log('[GellyWorld] init —', w, 'x', h);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(this.theme.clearColor);

    this.css2dRenderer = new CSS2DRenderer();
    this.css2dRenderer.setSize(w, h);
    this.css2dRenderer.domElement.style.position = 'absolute';
    this.css2dRenderer.domElement.style.top = '0';
    this.css2dRenderer.domElement.style.left = '0';
    this.css2dRenderer.domElement.style.pointerEvents = 'none';
    this.container.appendChild(this.css2dRenderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(this.theme.fogColor, this.theme.fogDensity);

    this.camera = new THREE.PerspectiveCamera(70, w / h, 0.1, 300);
    this.camera.position.set(0, 1 + CAM_HEIGHT, 8 + CAM_DIST);
    this.camera.lookAt(0, 2, 8);

    this.buildLights();
    this.buildGround();
    this.buildPortals();
    this.buildStarfield();

    // Hero is added to scene here now that this.scene is initialised
    this.player = new GellyPlayerController(this.scene, heroRenderer);

    this.animate();
  }

  // ─── Lights ──────────────────────────────────────────────────────────────────

  private buildLights(): void {
    const { ambientLight, directionalLight, accentLights } = this.theme;

    this.scene.add(new THREE.AmbientLight(ambientLight.color, ambientLight.intensity));

    const sun = new THREE.DirectionalLight(directionalLight.color, directionalLight.intensity);
    sun.position.set(...directionalLight.position);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(2048);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -60;
    sun.shadow.camera.right = sun.shadow.camera.top = 60;
    sun.shadow.camera.far = 150;
    this.scene.add(sun);

    for (const al of accentLights) {
      const light = new THREE.PointLight(al.color, al.intensity, al.distance);
      light.position.set(...al.position);
      this.scene.add(light);
    }
  }

  // ─── Ground ──────────────────────────────────────────────────────────────────

  private buildGround(): void {
    const { ground, spawnRingColor } = this.theme;

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(ground.size, ground.size),
      new THREE.MeshStandardMaterial({ color: ground.color, roughness: ground.roughness }),
    );
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    this.scene.add(plane);

    const grid = new THREE.GridHelper(ground.size, ground.gridDivisions, ground.gridColor1, ground.gridColor2);
    grid.position.y = 0.02;
    this.scene.add(grid);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3, 0.08, 8, 64),
      new THREE.MeshBasicMaterial({ color: spawnRingColor }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.03, 8);
    this.scene.add(ring);
  }

  // ─── Portals ─────────────────────────────────────────────────────────────────

  private buildPortals(): void {
    for (const portal of this.portals) {
      const group = portal.buildGroup();
      group.position.set(...portal.position);
      this.scene.add(group);
      this.portalGroups.set(portal.id, group);

      const r = (portal.color >> 16) & 0xff;
      const g = (portal.color >> 8) & 0xff;
      const b = portal.color & 0xff;

      const div = document.createElement('div');
      div.className = 'world-label';
      div.textContent = portal.name;
      div.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.85)`;
      div.style.boxShadow = `0 0 12px rgba(${r}, ${g}, ${b}, 0.35)`;

      const label = new CSS2DObject(div);
      label.position.set(0, portal.scale[1] + 2.5, 0);
      group.add(label);
    }
  }

  // ─── Starfield ───────────────────────────────────────────────────────────────

  private buildStarfield(): void {
    const positions = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 250;
      positions[i * 3 + 1] = Math.random() * 90 + 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 250;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.25 })));
  }

  // ─── Animation loop ──────────────────────────────────────────────────────────

  private animate(): void {
    this.rafId = requestAnimationFrame(() => this.animate());
    const delta = Math.min(this.clock.getDelta(), 0.05);

    this.player.update(delta, this.input.getMovement());

    const camTarget = new THREE.Vector3(
      this.player.position.x,
      this.player.position.y + CAM_HEIGHT,
      this.player.position.z + CAM_DIST,
    );
    this.camera.position.lerp(camTarget, 0.07);
    this.camera.lookAt(this.player.position.x, this.player.position.y + 1, this.player.position.z);

    this.checkProximity();
    this.pulseGlows(this.clock.getElapsedTime());

    this.renderer.render(this.scene, this.camera);
    this.css2dRenderer.render(this.scene, this.camera);
  }

  // ─── Proximity ───────────────────────────────────────────────────────────────

  private checkProximity(): void {
    let nearest: GamePortal | null = null;
    let minDist = INTERACT_RADIUS;

    for (const portal of this.portals) {
      const dist = this.player.position.distanceTo(new THREE.Vector3(...portal.position));
      if (dist < minDist) { minDist = dist; nearest = portal; }
    }

    if (nearest?.id !== this.nearbyPortal?.id) {
      this.nearbyPortal = nearest;
      this.onNearPortal(nearest);

      if (nearest) {
        const g = this.portalGroups.get(nearest.id)!;
        gsap.to(g.scale, { x: 1.05, y: 1.05, z: 1.05, duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.inOut' });
      }
    }
  }

  private pulseGlows(t: number): void {
    this.portalGroups.forEach((group) => {
      const light = group.children.find((c): c is THREE.PointLight => c instanceof THREE.PointLight);
      if (light) light.intensity = 1.8 + Math.sin(t * 1.3 + group.position.x * 0.1) * 0.6;
    });
  }

  private handleInteract(): void {
    if (this.nearbyPortal) this.onEnterPortal(this.nearbyPortal);
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  resize(w: number, h: number): void {
    this.renderer.setSize(w, h);
    this.css2dRenderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.input.destroy();
    this.player.destroy();
    gsap.globalTimeline.clear();
    this.css2dRenderer.domElement.remove();
    this.renderer.dispose();
    this.scene.clear();
  }
}
