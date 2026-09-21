import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import gsap from 'gsap';
import { disposeObject } from './gelly/gelly-models';
import { GellyInputController } from './gelly-input.controller';
import { GellyPlayerController } from './gelly-player.controller';
import { GellyPortalVortex } from './gelly-portal-vortex';
import { CameraMode, GellyCameraController } from './gelly-camera.controller';
import { GamePortal } from '../../shared/world/game-portal.model';
import { HeroAction, HeroRenderer } from '../../shared/world/hero-renderer.interface';
import { WorldEnvironment } from '../../shared/world/world-environment.interface';
import { WorldTheme } from '../../shared/world/world-theme.model';

const INTERACT_RADIUS = 9;
const ENTRY_RADIUS = 2.1;
const ENTRY_DURATION = 1.6;

interface PortalUI {
  labelEl: HTMLDivElement;
  targetRing: THREE.Mesh;
  colorRGB: [number, number, number];
}

export class GellyWorldScene {
  private entry: { portal: GamePortal; elapsed: number; vortex: GellyPortalVortex; completed: boolean } | null = null;
  readonly input: GellyInputController;

  private renderer!: THREE.WebGLRenderer;
  private css2dRenderer!: CSS2DRenderer;
  private composer: EffectComposer | null = null;
  private scene!: THREE.Scene;
  private cameraController!: GellyCameraController;
  private player!: GellyPlayerController;
  private clock = new THREE.Timer();
  private endlessGround?: THREE.Group;
  private skyDome?: THREE.Group;
  private groundSpacing = 5;
  private rafId = 0;
  private nearbyPortal: GamePortal | null = null;
  private readonly portalGroups = new Map<string, THREE.Group>();
  private readonly portalUI     = new Map<string, PortalUI>();
  private environment: WorldEnvironment | null = null;
  private readonly portalSurfaces: THREE.ShaderMaterial[] = [];
  private readonly hallAnimations: THREE.Object3D[] = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly container: HTMLElement,
    private readonly onNearPortal: (p: GamePortal | null) => void,
    private readonly onEnterPortal: (p: GamePortal) => void,
    private readonly theme: WorldTheme,
    private readonly portals: GamePortal[],
    heroRenderer: HeroRenderer,
    environment: WorldEnvironment | null = null,
    private readonly onEntryStart: (portal: GamePortal) => void = () => {},
  ) {
    this.environment = environment;
    this.input = new GellyInputController(() => this.handleInteract(), action => this.player?.playAction(action));
    this.init(heroRenderer);
  }

  setLanguage(translate: (value: string) => string, rtl: boolean): void {
    this.scene.traverse(object => object.userData['localize']?.(translate, rtl));
    for (const portal of this.portals) {
      const element = this.portalUI.get(portal.id)?.labelEl;
      if (element) { element.textContent = translate(portal.name); element.dir = rtl ? 'rtl' : 'ltr'; }
    }
  }

  private init(heroRenderer: HeroRenderer): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    console.log('[GellyWorld] init —', w, 'x', h);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setClearColor(this.theme.clearColor);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.css2dRenderer = new CSS2DRenderer();
    this.css2dRenderer.setSize(w, h);
    this.css2dRenderer.domElement.style.position = 'absolute';
    this.css2dRenderer.domElement.style.top = '0';
    this.css2dRenderer.domElement.style.left = '0';
    this.css2dRenderer.domElement.style.pointerEvents = 'none';
    this.container.appendChild(this.css2dRenderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(this.theme.fogColor, this.theme.fogDensity);

    this.cameraController = new GellyCameraController(w / h);

    this.buildLights();
    this.buildGround();
    this.buildPortals();
    this.buildSky();

    this.environment?.build(this.scene);

    this.clock.connect(document);
    this.scene.updateMatrixWorld(true);
    this.cameraController.setCollisionObjects([...this.portalGroups.values()]);
    this.player = new GellyPlayerController(this.scene, heroRenderer, [...this.portals.map(portal => ({
      x: portal.position[0], z: portal.position[2], halfWidth: portal.scale[0] / 2, halfDepth: portal.scale[2] / 2,
    })), ...(this.environment?.obstacles ?? [])]);
    this.cameraController.init(this.player.position, this.player.heading, this.player.eyes);

    this.buildPostProcessing(w, h);
    this.clock.reset();
    this.animate();
  }

  // ─── Lights ──────────────────────────────────────────────────────────────────

  private buildLights(): void {
    const { ambientLight, hemisphereLight, directionalLight, accentLights } = this.theme;

    if (hemisphereLight) {
      this.scene.add(new THREE.HemisphereLight(
        hemisphereLight.skyColor,
        hemisphereLight.groundColor,
        hemisphereLight.intensity,
      ));
    }

    this.scene.add(new THREE.AmbientLight(ambientLight.color, ambientLight.intensity));

    const moon = new THREE.DirectionalLight(directionalLight.color, directionalLight.intensity);
    moon.position.set(...directionalLight.position);
    moon.castShadow = true;
    moon.shadow.mapSize.setScalar(2048);
    moon.shadow.camera.left   = -60;
    moon.shadow.camera.right  =  60;
    moon.shadow.camera.top    =  60;
    moon.shadow.camera.bottom = -60;
    moon.shadow.camera.far    =  250;
    moon.shadow.normalBias = .035;
    moon.shadow.bias = -.0002;
    this.scene.add(moon);

    for (const al of accentLights) {
      const light = new THREE.PointLight(al.color, al.intensity, al.distance);
      light.position.set(...al.position);
      this.scene.add(light);
    }
  }

  // ─── Ground ──────────────────────────────────────────────────────────────────

  private buildGround(): void {
    const { ground, spawnRingColor } = this.theme;

    const planeMat = new THREE.MeshStandardMaterial({
      color: ground.color,
      roughness: ground.roughness,
      ...(ground.emissive !== undefined
        ? { emissive: new THREE.Color(ground.emissive), emissiveIntensity: ground.emissiveIntensity ?? 0.1 }
        : {}),
    });
    // Reuse a camera-centred patch larger than the visible range. Its grid
    // moves by whole cells so the floor never slides beneath the hero.
    this.endlessGround = new THREE.Group();
    this.scene.add(this.endlessGround);
    this.groundSpacing = ground.size / ground.gridDivisions;
    const divisions = Math.ceil(1200 / this.groundSpacing);
    const size = divisions * this.groundSpacing;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    this.endlessGround.add(plane);

    // Grid kept for sense of scale but rendered near-invisible
    const grid = new THREE.GridHelper(size, divisions, ground.gridColor1, ground.gridColor2);
    grid.position.y = 0.02;
    const gridMat = grid.material as THREE.LineBasicMaterial;
    gridMat.transparent = true;
    gridMat.opacity = 0.015;
    this.endlessGround.add(grid);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3, 0.09, 8, 64),
      new THREE.MeshBasicMaterial({ color: spawnRingColor }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.04, 8);
    this.scene.add(ring);
  }

  // ─── Portals ─────────────────────────────────────────────────────────────────

  private buildPortals(): void {
    for (const portal of this.portals) {
      const group = portal.buildGroup();
      group.position.set(...portal.position);
      this.scene.add(group);
      this.portalGroups.set(portal.id, group);
      group.traverse(object => { if (object.userData['spin'] !== undefined) this.hallAnimations.push(object); if (object.userData['portalSurface']) this.portalSurfaces.push((object as THREE.Mesh).material as THREE.ShaderMaterial); });

      const r = (portal.color >> 16) & 0xff;
      const g = (portal.color >> 8)  & 0xff;
      const b =  portal.color        & 0xff;

      const div = document.createElement('div');
      div.className = 'world-label';
      // Hall plaques carry the names; reveal the floating hint only on approach.
      div.style.opacity = '0';
      div.style.transition = 'opacity 180ms ease';
      div.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.85)`;
      div.style.boxShadow   = `0 0 14px rgba(${r}, ${g}, ${b}, 0.4)`;

      if (portal.buildLabel) {
        portal.buildLabel(div);
      } else {
        div.textContent = portal.name;
      }

      const label = new CSS2DObject(div);
      label.position.set(0, portal.scale[1] + 3, 0);
      group.add(label);

      const targetRing = this.buildTargetRing(portal);
      group.add(targetRing);

      this.portalUI.set(portal.id, { labelEl: div, targetRing, colorRGB: [r, g, b] });
    }
  }

  private buildTargetRing(portal: GamePortal): THREE.Mesh {
    const radius = Math.max(portal.scale[0], portal.scale[2]) / 2 + 2.2;
    const mat = new THREE.MeshBasicMaterial({
      color: portal.color,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.16, 8, 48),
      mat,
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    return ring;
  }

  // ─── Sky ─────────────────────────────────────────────────────────────────────
  //
  // Gradient sky dome from deep-purple zenith → warm purple-pink horizon.
  // Stars are placed on the inner dome surface so they are always visible.

  private buildSky(): void {
    this.skyDome = new THREE.Group();
    this.scene.add(this.skyDome);
    // Gradient dome — custom shader so scene fog never affects it
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor:  { value: new THREE.Color(0x2D4DCC) },  // Deep blue zenith — Art Bible
        midColor:  { value: new THREE.Color(0x3935a0) },  // Violet mid-sky
        botColor:  { value: new THREE.Color(0xe18bcb) },  // Warm pink horizon
        hazeColor: { value: new THREE.Color(0xeeafd6) },  // Soft lower haze
      },
      vertexShader: `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 botColor;
        uniform vec3 hazeColor;
        varying vec3 vDirection;
        void main() {
          vec3 direction = normalize(vDirection);
          float t = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 col = mix(hazeColor, botColor, smoothstep(0.0, 0.35, t));
          col = mix(col, midColor, smoothstep(0.28, 0.62, t));
          col = mix(col, topColor, smoothstep(0.55, 1.0, t));
          // Layered cloud banks around the horizon, with softly scalloped edges.
          float azimuth = atan(direction.z, direction.x);
          float cloudLine = .085 + .045 * sin(azimuth * 9.) + .022 * sin(azimuth * 23.);
          float clouds = exp(-pow((direction.y - cloudLine) / .045, 2.));
          clouds *= .5 + .5 * sin(azimuth * 6. + .7);
          col = mix(col, vec3(.64, .28, .65), clouds * .58);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.skyDome.add(new THREE.Mesh(new THREE.SphereGeometry(280, 32, 16), skyMat));

    // Stars distributed over the upper hemisphere — fog: false so they never fade
    const COUNT = 600;
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const theta = (i * 2.399963) % (Math.PI * 2); // golden angle — no clustering
      const phi   = Math.acos(1 - (i / COUNT));      // uniform upper hemisphere
      const r     = 240 + (i * 0.137) % 35;
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 8;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.skyDome.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.20,
      transparent: true,
      opacity: 0.40,
      sizeAttenuation: true,
      fog: false,
    })));
  }

  // ─── Post-processing ─────────────────────────────────────────────────────────
  //
  // UnrealBloomPass with a high threshold so only emissive-bright pixels bloom.
  // Skipped on touch devices — saves ~2 render targets worth of VRAM and ~15 %
  // GPU time on mobile GPUs.

  private buildPostProcessing(w: number, h: number): void {
    const isMobile = navigator.maxTouchPoints > 1;
    if (isMobile) return;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.cameraController.camera));

    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.33, 0.40, 0.88);
    this.composer.addPass(bloom);
    this.composer.addPass(new OutputPass());
  }

  // ─── Animation loop ──────────────────────────────────────────────────────────

  private updateEndlessBackdrop(): void {
    const position = this.cameraController.camera?.position;
    if (!position) return;
    this.endlessGround?.position.set(
      Math.round(position.x / this.groundSpacing) * this.groundSpacing, 0,
      Math.round(position.z / this.groundSpacing) * this.groundSpacing,
    );
    this.skyDome?.position.copy(position);
  }

  private animate(): void {
    this.rafId = requestAnimationFrame(() => this.animate());
    this.clock.update();
    // Preserve real movement speed on slow frames, but cap catch-up after a stall.
    const delta   = Math.min(this.clock.getDelta(), 0.25);
    const elapsed = this.clock.getElapsed();

    // Small simulation steps keep steering and collisions stable at low FPS.
    const steps = Math.max(1, Math.ceil(delta / (1 / 60)));
    const stepDelta = delta / steps;
    const movement = this.input.getMovement();
    for (let step = 0; step < steps; step++) {
      this.player.update(stepDelta, movement);
    }
    this.environment?.update(elapsed, delta);
    for (const material of this.portalSurfaces ?? []) material.uniforms['t'].value = elapsed;
    for (const object of this.hallAnimations) {
      object.rotation.y += object.userData['spin'] * delta;
      object.position.y = object.userData['floatY'] + Math.sin(elapsed * 1.4) * .16;
    }

    if (this.entry) {
      this.entry.elapsed += delta;
      const progress = Math.min(1, this.entry.elapsed / ENTRY_DURATION);
      this.player.updatePortalEntry(progress);
      this.entry.vortex.update(progress);
    } else {
      this.cameraController.update(this.player.position, this.player.heading, this.player.eyes, delta);
    }

    this.updateEndlessBackdrop();
    this.checkProximity();
    this.pulseGlows(elapsed);

    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.cameraController.camera);
    }
    this.css2dRenderer.render(this.scene, this.cameraController.camera);
    // Render the final disappearance before handing off to the game's route.
    if (this.entry && this.entry.elapsed >= ENTRY_DURATION && !this.entry.completed) {
      this.entry.completed = true;
      this.onEnterPortal(this.entry.portal);
    }
  }

  // ─── Proximity ───────────────────────────────────────────────────────────────

  private checkProximity(): void {
    if (this.entry) return;
    let nearest: GamePortal | null = null;
    let minDist = INTERACT_RADIUS;

    for (const portal of this.portals) {
      const entranceZ = portal.position[2] + portal.scale[2] / 2;
      const dist = Math.hypot(this.player.position.x - portal.position[0], this.player.position.z - entranceZ);
      if (dist < minDist) { minDist = dist; nearest = portal; }
    }

    if (nearest && minDist < ENTRY_RADIUS && this.player.position.z >= nearest.position[2] + nearest.scale[2] / 2) {
      this.beginEntry(nearest);
      return;
    }
    if (nearest?.id === this.nearbyPortal?.id) return;

    // Depart previous target
    if (this.nearbyPortal) {
      const g  = this.portalGroups.get(this.nearbyPortal.id)!;
      const ui = this.portalUI.get(this.nearbyPortal.id)!;
      const [r, g_, b] = ui.colorRGB;

      this.nearbyPortal.onDepart?.(g);
      this.player.setFocused(false);

      ui.labelEl.style.borderColor = `rgba(${r}, ${g_}, ${b}, 0.85)`;
      ui.labelEl.style.boxShadow   = `0 0 14px rgba(${r}, ${g_}, ${b}, 0.4)`;
      ui.labelEl.style.color       = '';
      ui.labelEl.style.opacity     = '0';

      gsap.killTweensOf(ui.targetRing.scale);
      gsap.killTweensOf(ui.targetRing.material);
      gsap.to(ui.targetRing.material as THREE.MeshBasicMaterial, { opacity: 0, duration: 0.3 });
    }

    this.nearbyPortal = nearest;
    this.onNearPortal(nearest);

    // Approach new target
    if (nearest) {
      const g  = this.portalGroups.get(nearest.id)!;
      const ui = this.portalUI.get(nearest.id)!;
      const [r, g_, b] = ui.colorRGB;

      nearest.onApproach?.(g);
      this.player.setFocused(true);

      ui.labelEl.style.borderColor = `rgba(${r}, ${g_}, ${b}, 1.0)`;
      ui.labelEl.style.boxShadow   = `0 0 28px rgba(${r}, ${g_}, ${b}, 0.9), 0 0 8px rgba(255,255,255,0.2)`;
      ui.labelEl.style.color       = '#ffffff';
      ui.labelEl.style.opacity     = '1';

      ui.targetRing.scale.setScalar(0.3);
      gsap.killTweensOf(ui.targetRing.scale);
      gsap.killTweensOf(ui.targetRing.material);
      gsap.to(ui.targetRing.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'back.out(2.5)' });
      gsap.to(ui.targetRing.material as THREE.MeshBasicMaterial, { opacity: 0.6, duration: 0.5, ease: 'sine.out' });
    }
  }

  private pulseGlows(t: number): void {
    this.portalGroups.forEach((group, id) => {
      const isActive = id === this.nearbyPortal?.id;
      const light = group.children.find((c): c is THREE.PointLight => c instanceof THREE.PointLight);
      if (light) {
        const base = isActive ? 3.5 : 2.0;
        light.intensity = base + Math.sin(t * 1.3 + group.position.x * 0.1) * 0.7;
      }
    });

    this.portalUI.forEach((ui, id) => {
      // Continuous slow rotation on all target rings
      ui.targetRing.rotation.z += 0.006;

      // Pulse opacity on the active ring
      if (id === this.nearbyPortal?.id) {
        (ui.targetRing.material as THREE.MeshBasicMaterial).opacity =
          0.45 + Math.sin(t * 2.8) * 0.15;
      }
    });
  }

  private handleInteract(): void {
    if (this.nearbyPortal && !this.entry) this.beginEntry(this.nearbyPortal);
  }

  private beginEntry(portal: GamePortal): void {
    if (this.entry) return;
    const door = new THREE.Vector3(portal.position[0], 1.65, portal.position[2] + portal.scale[2] / 2 + .4);
    // Show the whole animation even when approaching in first person.
    this.cameraController.setMode('third-person');
    this.cameraController.init(this.player.position, Math.PI, this.player.eyes);
    this.player.startPortalEntry(door);
    const vortex = new GellyPortalVortex(door, portal.color);
    this.scene.add(vortex.mesh);
    this.entry = { portal, elapsed: 0, vortex, completed: false };
    this.nearbyPortal = null;
    this.onNearPortal(null);
    this.onEntryStart(portal);
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  orbitCamera(dx: number, dy: number): void {
    if (!this.entry) this.cameraController.orbit(dx, dy);
  }

  setCameraMode(mode: CameraMode): void {
    if (this.entry) return;
    this.cameraController.setMode(mode);
    this.player.setFirstPerson(mode === 'first-person');
    this.cameraController.init(this.player.position, this.player.heading, this.player.eyes);
  }

  playAction(action: HeroAction): void { this.player.playAction(action); }

  interact(): void { this.handleInteract(); }

  resize(w: number, h: number): void {
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
    this.css2dRenderer.setSize(w, h);
    this.cameraController.resize(w / h);
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.entry?.vortex.destroy();
    this.clock.disconnect();
    this.input.destroy();
    this.player.destroy();
    this.environment?.destroy();
    this.scene.traverse(object => { gsap.killTweensOf(object.position); gsap.killTweensOf(object.scale); gsap.killTweensOf(object.rotation); });
    this.css2dRenderer.domElement.remove();
    this.composer?.dispose();
    this.renderer.dispose();
    disposeObject(this.scene);
    this.scene.clear();
  }
}
