import * as THREE from 'three';
import { mountGellyModel } from './gelly-models';
import { WorldEnvironment } from '../../../shared/world/world-environment.interface';
import { GamePortal } from '../../../shared/world/game-portal.model';
import { WorldObstacle } from '../../../shared/world/world-obstacle.model';

const SPAWN             = new THREE.Vector3(0, 0, 8);
const PLAZA_RADIUS      = 9;
const ROAD_SEGMENTS     = 42;
const ROAD_PARTICLE_COUNT = 18;

// ─── Road shader ──────────────────────────────────────────────────────────────
//
// Center stripe: traveling wave from plaza (v=0) toward portal (v=1).
// Brightness ramps up near the portal end and falls off at stripe U-edges.
// Uses additive blending — black areas contribute nothing so the base shows.

const STRIPE_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const STRIPE_FRAG = `
  uniform float uTime;
  uniform vec3  uColor;
  varying vec2  vUv;
  void main() {
    float wave   = fract(vUv.y * 3.5 - uTime * 0.42);
    float streak = smoothstep(0.0, 0.25, wave) * smoothstep(1.0, 0.35, wave);
    float nearEnd = smoothstep(0.25, 1.0, vUv.y);
    float cu = clamp(1.0 - abs(vUv.x - 0.5) * 2.2, 0.0, 1.0);
    float b  = (0.20 + streak * 1.10 + nearEnd * 0.55) * cu;
    gl_FragColor = vec4(uColor * b, 1.0);
  }
`;

// ─── Magical road record ──────────────────────────────────────────────────────

interface MagicalRoad {
  curve: THREE.CatmullRomCurve3;
  stripeUniforms: { uTime: { value: number }; uColor: { value: THREE.Color } };
  edgeMats: THREE.MeshStandardMaterial[];
  phaseOffset: number;
  particlePoints: THREE.Points;
  particleT:      Float32Array;
  particleSpeeds: Float32Array;
  particleSeeds:  Float32Array;
}

// ─── Ribbon geometry helper ───────────────────────────────────────────────────
//
// Flat mesh that follows a CatmullRomCurve3.
// u ∈ [0,1] left→right across width; v ∈ [0,1] plaza→portal along length.
// lateralShift offsets the ribbon center perpendicular to the spine.

function buildRoadRibbon(
  curve: THREE.CatmullRomCurve3,
  width: number,
  lateralShift: number,
  yOffset: number,
  segments: number,
): THREE.BufferGeometry {
  const verts:  number[] = [];
  const uvs:    number[] = [];
  const idx:    number[] = [];
  const up      = new THREE.Vector3(0, 1, 0);
  const right   = new THREE.Vector3();
  const tangent = new THREE.Vector3();

  for (let i = 0; i <= segments; i++) {
    const t   = i / segments;
    const pos = curve.getPoint(t);
    curve.getTangent(t, tangent);
    tangent.normalize();
    right.crossVectors(up, tangent).normalize();

    const cx = pos.x + right.x * lateralShift;
    const cz = pos.z + right.z * lateralShift;
    const hw = width / 2;

    verts.push(
      cx - right.x * hw, yOffset, cz - right.z * hw,
      cx + right.x * hw, yOffset, cz + right.z * hw,
    );
    uvs.push(0, t, 1, t);

    if (i > 0) {
      const b = (i - 1) * 2;
      idx.push(b, b + 2, b + 1,  b + 1, b + 2, b + 3);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs,   2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// Rounded foliage in the four candy colors from the v2 asset sheet.
// Shared geometry and instanced canopies keep the scenery inexpensive to draw.
function buildJellyTree(scale: number, seed: number): THREE.Group {
  const group = new THREE.Group();
  group.scale.setScalar(scale);
  const colors = [0x70bc39, 0x8642cb, 0xe458b0, 0x21b5b9];
  const color = colors[Math.floor(seed) % colors.length];
  const trunkMat = new THREE.MeshStandardMaterial({color: 0x93603c, roughness: .55});
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.22, .4, 2.2, 12), trunkMat);
  trunk.position.y = 1.1; trunk.castShadow = true; group.add(trunk);
  const geometry = new THREE.SphereGeometry(1, 16, 12);
  const leaves = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: .34, metalness: .03,
  }), 12);
  const transform = new THREE.Object3D();
  for (let i = 0; i < 12; i++) {
    const tier = Math.floor(i / 5), angle = i * 2.39996;
    const spread = tier === 2 ? .35 : 1.02 - tier * .24;
    transform.position.set(Math.cos(angle) * spread, 2.35 + tier * .72, Math.sin(angle) * spread);
    transform.scale.setScalar(.79 - tier * .1);
    transform.updateMatrix(); leaves.setMatrixAt(i, transform.matrix);
    leaves.setColorAt(i, new THREE.Color(color).multiplyScalar(.88 + (i % 4) * .08));
  }
  leaves.castShadow = true; leaves.receiveShadow = true; group.add(leaves);
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2;
    const root = new THREE.Mesh(geometry, trunkMat);
    root.position.set(Math.cos(angle) * .3, .14, Math.sin(angle) * .3);
    root.scale.set(.46, .18, .24); root.rotation.y = -angle; group.add(root);
  }
  return group;
}

// ─── Crystal cluster ──────────────────────────────────────────────────────────
//
// [ox, oz, height, tiltZ, rotY] — heights are 2–3× larger than before,
// radii increased from 0.14 to 0.30 so clusters read clearly at distance.

const CRYSTAL_OFFSETS: [number, number, number, number, number][] = [
  [ 0.00,  0.00,   3.20,   0.00,  0.0],
  [ 0.90,  0.40,   2.10,   0.18,  0.8],
  [-0.65,  0.80,   2.60,  -0.22,  1.9],
  [ 0.50, -0.70,   1.75,   0.15,  3.1],
  [-0.80, -0.45,   2.35,  -0.12,  5.0],
];

function buildCrystalCluster(
  color: number,
  count: number,
): [THREE.Group, THREE.PointLight] {
  const group = new THREE.Group();
  const mat   = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.18,
    roughness: 0.10,
    metalness: 0.12,
    transparent: true,
    opacity: 0.88,
  });

  for (let i = 0; i < Math.min(count, CRYSTAL_OFFSETS.length); i++) {
    const [ox, oz, h, tiltZ, rotY] = CRYSTAL_OFFSETS[i];
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), mat);
    crystal.scale.set(.42, h * .32, .42);
    crystal.position.set(ox, h * .32, oz);
    crystal.rotation.set(0, rotY, tiltZ);
    group.add(crystal);
  }

  const light = new THREE.PointLight(color, 1.8, 22);
  light.position.y = 2.5;
  group.add(light);

  return [group, light];
}

// ─── Mushroom prop ─────────────────────────────────────────────────────────────
//
// Cap uses MeshStandardMaterial with real emissive so the bloom pass picks it
// up on desktop and it self-illuminates on mobile.

function buildMushroom(color: number, scale: number): THREE.Group {
  const group = new THREE.Group();

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12 * scale, 0.16 * scale, 0.55 * scale, 7),
    new THREE.MeshStandardMaterial({ color: 0xf0e0ff, roughness: 0.65 }),
  );
  stem.position.y = 0.275 * scale;
  group.add(stem);

  // Spots on the cap — tiny raised bumps in a lighter shade.
  const spotCol = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.50);
  const spotMat = new THREE.MeshStandardMaterial({
    color: spotCol,
    emissive: spotCol,
    emissiveIntensity: 0.30,
    roughness: 0.40,
  });
  for (let s = 0; s < 4; s++) {
    const sa   = (s / 4) * Math.PI * 2;
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.055 * scale, 5, 4), spotMat);
    spot.position.set(
      Math.cos(sa) * 0.28 * scale,
      0.56 * scale,
      Math.sin(sa) * 0.28 * scale,
    );
    group.add(spot);
  }

  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.45 * scale, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.6),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.55,
      roughness: 0.35,
    }),
  );
  cap.position.y = 0.52 * scale;
  group.add(cap);

  return group;
}

// ─── Floating island ─────────────────────────────────────────────────────────

function buildFloatingIsland(radius: number): THREE.Group {
  const g = new THREE.Group();

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.75, 1.0, 12),
    new THREE.MeshStandardMaterial({
      color: 0x1e0a38,
      roughness: 0.85,
      emissive: 0x0e0422,
      emissiveIntensity: 0.2,
    }),
  );
  top.position.y = 0.5;
  top.castShadow = true;
  g.add(top);

  // Tapered underbelly
  const belly = new THREE.Mesh(
    new THREE.ConeGeometry(radius * 0.75, 2.0, 12),
    new THREE.MeshStandardMaterial({ color: 0x100220, roughness: 0.95 }),
  );
  belly.position.y = -0.5;
  belly.rotation.x = Math.PI;
  g.add(belly);

  // Glowing rim
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.1, 6, 48),
    new THREE.MeshBasicMaterial({ color: 0x9d5cff }),
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 1.0;
  g.add(rim);

  // Small crystal on top for detail
  const crystal = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.9, 5),
    new THREE.MeshStandardMaterial({
      color: 0xd8b4fe,
      emissive: 0xd8b4fe,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      transparent: true,
      opacity: 0.9,
    }),
  );
  crystal.position.y = 1.5;
  g.add(crystal);

  return g;
}

// ─── Environment ─────────────────────────────────────────────────────────────

export class GellyEnvironment implements WorldEnvironment {
  readonly obstacles: WorldObstacle[] = [];

  // Register only solid props: paths, grass, lights and airborne scenery stay walkable.
  private updateObstacle(object: THREE.Object3D, obstacle: WorldObstacle): void {
    const bounds = new THREE.Box3().setFromObject(object);
    if (bounds.isEmpty()) return;
    Object.assign(obstacle, {
      x: (bounds.min.x + bounds.max.x) / 2,
      z: (bounds.min.z + bounds.max.z) / 2,
      halfWidth: (bounds.max.x - bounds.min.x) / 2,
      halfDepth: (bounds.max.z - bounds.min.z) / 2,
    });
  }

  private addObstacle(object: THREE.Object3D): WorldObstacle {
    const obstacle = { x: 0, z: 0, halfWidth: 0, halfDepth: 0 };
    this.updateObstacle(object, obstacle);
    this.obstacles.push(obstacle);
    return obstacle;
  }
  private particles!: THREE.Points;
  private particleBaseY = new Float32Array(0);
  private particleSeeds = new Float32Array(0);

  private centerpieceLight!: THREE.PointLight;
  private centerpieceCrystal!: THREE.Mesh;
  private crystalLights: THREE.PointLight[] = [];

  // Animated world elements
  private treeGroups: Array<{ g: THREE.Group; phase: number; speed: number }> = [];
  private islandGroups: THREE.Group[] = [];
  private islandBaseY: number[] = [];
  private roads: MagicalRoad[] = [];

  // Grass particles
  private grassParticles!: THREE.Points;
  private grassBaseX  = new Float32Array(0);
  private grassBaseZ  = new Float32Array(0);
  private grassSeeds  = new Float32Array(0);

  constructor(private readonly portals: GamePortal[]) {}

  build(scene: THREE.Scene): void {
    this.buildPlaza(scene);

    this.buildMagicalRoads(scene);
    this.buildTrees(scene);
    this.buildCrystals(scene);
    this.buildProps(scene);
    this.buildGardens(scene);
    this.buildParticles(scene);
    this.buildGrassParticles(scene);
    this.buildDistantElements(scene);
  }

  // ─── Central plaza ──────────────────────────────────────────────────────────

  private buildPlaza(scene: THREE.Scene): void {
    const outer = new THREE.Mesh(
      new THREE.CylinderGeometry(PLAZA_RADIUS, PLAZA_RADIUS + 0.6, 0.28, 64),
      new THREE.MeshStandardMaterial({ color: 0x5c4e87, roughness: 0.82 }),
    );
    outer.position.set(0, -0.06, 8);
    outer.receiveShadow = true;
    scene.add(outer);

    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(PLAZA_RADIUS * 0.55, PLAZA_RADIUS * 0.55, 0.32, 64),
      new THREE.MeshStandardMaterial({ color: 0x75619d, roughness: 0.76 }),
    );
    inner.position.set(0, -0.03, 8);
    inner.receiveShadow = true;
    scene.add(inner);

    const borderRing = new THREE.Mesh(
      new THREE.TorusGeometry(PLAZA_RADIUS, 0.14, 8, 72),
      new THREE.MeshStandardMaterial({ color: 0xff82e9, emissive: 0xf34ad7, emissiveIntensity: 1.35 }),
    );
    borderRing.rotation.x = -Math.PI / 2;
    borderRing.position.set(0, 0.12, 8);
    scene.add(borderRing);

    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(PLAZA_RADIUS * 0.55, 0.09, 8, 64),
      new THREE.MeshStandardMaterial({ color: 0xffa3f2, emissive: 0xfa63e7, emissiveIntensity: 1.25 }),
    );
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.set(0, 0.12, 8);
    scene.add(innerRing);

    // Concentric seams and staggered radial joints make a readable stone plaza.
    const seamMat = new THREE.MeshBasicMaterial({color: 0x393456});
    for (const radius of [2.2, 3.4, 4.7, 6.1, 7.5, 8.9]) {
      const seam = new THREE.Mesh(new THREE.TorusGeometry(radius, .025, 4, 96), seamMat);
      seam.rotation.x = -Math.PI / 2; seam.position.set(0, .145, 8); scene.add(seam);
      for (let i = 0; i < 20; i++) {
        const a = i / 20 * Math.PI * 2 + radius * .17;
        const joint = new THREE.Mesh(new THREE.BoxGeometry(.035, .025, 1.22), seamMat);
        joint.position.set(Math.sin(a) * (radius - .64), .15, 8 + Math.cos(a) * (radius - .64));
        joint.rotation.y = a; scene.add(joint);
      }
    }
    const bollardMat = new THREE.MeshPhongMaterial({ color: 0x241560, shininess: 60 });
    const nibMat     = new THREE.MeshBasicMaterial({ color: 0xb06cff });
    for (let i = 0; i < 6; i++) {
      const a  = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const bx = Math.sin(a) * PLAZA_RADIUS;
      const bz = 8 + Math.cos(a) * PLAZA_RADIUS;

      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.56, 6), bollardMat);
      bollard.position.set(bx, 0.22, bz);
      scene.add(bollard);
      this.addObstacle(bollard);

      const nib = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), nibMat);
      nib.position.set(bx, 0.64, bz);
      scene.add(nib);
    }
  }

  // ─── Plaza centerpiece ──────────────────────────────────────────────────────

  private buildCenterpiece(scene: THREE.Scene): void {
    const group = new THREE.Group();
    group.position.set(0, 0, 8);

    const tier1 = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 3.0, 0.30, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e1255, roughness: 0.70 }),
    );
    tier1.position.y = 0.15;
    tier1.receiveShadow = true;
    group.add(tier1);

    const tier2 = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 2.0, 0.35, 8),
      new THREE.MeshStandardMaterial({ color: 0x271880, roughness: 0.65 }),
    );
    tier2.position.y = 0.48;
    group.add(tier2);

    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.28, 4.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x7c3aed, emissive: 0x4a1a9e, emissiveIntensity: 0.5, roughness: 0.25 }),
    );
    spire.position.y = 2.95;
    group.add(spire);

    const armMat = new THREE.MeshStandardMaterial({
      color: 0x9d5cff, emissive: 0x9d5cff, emissiveIntensity: 0.55,
      roughness: 0.2, transparent: true, opacity: 0.85,
    });
    for (let i = 0; i < 4; i++) {
      const a   = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const arm = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), armMat);
      arm.position.set(Math.cos(a) * 1.65, 1.25, Math.sin(a) * 1.65);
      arm.scale.y = 2.2;
      arm.rotation.y = a;
      group.add(arm);
    }

    this.centerpieceCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.62),
      new THREE.MeshStandardMaterial({
        color: 0xd8b4fe, emissive: 0xd8b4fe, emissiveIntensity: 1.6,
        roughness: 0.05, metalness: 0.15, transparent: true, opacity: 0.92,
      }),
    );
    this.centerpieceCrystal.position.y = 5.4;
    group.add(this.centerpieceCrystal);

    this.centerpieceLight = new THREE.PointLight(0xd8b4fe, 4.5, 24);
    this.centerpieceLight.position.y = 5.6;
    group.add(this.centerpieceLight);

    scene.add(group);
  }

  // ─── Magical roads ───────────────────────────────────────────────────────────
  //
  // Three curved roads, each with:
  //   • Base slab  — dark stone, barely emissive
  //   • Edge rails — portal-coloured, pulsing emissive MeshStandardMaterial
  //   • Center stripe — ShaderMaterial streaming light toward the portal
  //   • Road particles — Points that travel along the curve

  private buildMagicalRoads(scene: THREE.Scene): void {
    for (const portal of this.portals) {
      const curve = this.buildRoadCurve(portal);
      const color = new THREE.Color(portal.color);

      // Base slab
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x65518a,
        emissive: color,
        emissiveIntensity: 0.05,
        roughness: 0.92,
      });
      // Staggered paving joints stay aligned with the curved ribbon's UVs.
      // Shading the existing slab adds detail without hundreds of extra meshes.
      baseMat.onBeforeCompile = shader => {
        shader.vertexShader = 'varying vec2 vRoadUv;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvRoadUv = uv;');
        shader.fragmentShader = 'varying vec2 vRoadUv;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
          #include <color_fragment>
          float row = floor(vRoadUv.y * 26.);
          vec2 tile = fract(vec2(vRoadUv.x * 3. + mod(row, 2.) * .5, vRoadUv.y * 26.));
          float joint = smoothstep(0., .045, min(tile.x, 1. - tile.x))
            * smoothstep(0., .045, min(tile.y, 1. - tile.y));
          diffuseColor.rgb *= mix(.43, 1., joint);
        `);
      };
      baseMat.customProgramCacheKey = () => 'gelly-road-paving-v2';
      const baseMesh = new THREE.Mesh(buildRoadRibbon(curve, 3.0, 0, 0.02, ROAD_SEGMENTS), baseMat);
      baseMesh.receiveShadow = true;
      scene.add(baseMesh);

      // Edge rails — one per side, ±1.4 from centre
      const edgeMats: THREE.MeshStandardMaterial[] = [];
      for (const side of [-1, 1] as const) {
        const mat = new THREE.MeshStandardMaterial({
          color: 0x050112,
          emissive: color,
          emissiveIntensity: 0.85,
          roughness: 0.18,
        });
        scene.add(new THREE.Mesh(buildRoadRibbon(curve, 0.22, side * 1.4, 0.05, ROAD_SEGMENTS), mat));
        edgeMats.push(mat);
      }

      // Animated center stripe
      const stripeUniforms = {
        uTime:  { value: 0 },
        uColor: { value: color.clone() },
      };
      scene.add(new THREE.Mesh(
        buildRoadRibbon(curve, 0.38, 0, 0.06, ROAD_SEGMENTS),
        new THREE.ShaderMaterial({
          uniforms: stripeUniforms,
          vertexShader:   STRIPE_VERT,
          fragmentShader: STRIPE_FRAG,
          transparent: true,
          depthWrite:  false,
          blending:    THREE.AdditiveBlending,
        }),
      ));

      // Road particles
      const particleT      = new Float32Array(ROAD_PARTICLE_COUNT);
      const particleSpeeds = new Float32Array(ROAD_PARTICLE_COUNT);
      const particleSeeds  = new Float32Array(ROAD_PARTICLE_COUNT);
      const particlePos    = new Float32Array(ROAD_PARTICLE_COUNT * 3);

      for (let i = 0; i < ROAD_PARTICLE_COUNT; i++) {
        particleT[i]      = i / ROAD_PARTICLE_COUNT;
        particleSpeeds[i] = 0.06 + (i * 0.137) % 0.08;
        particleSeeds[i]  = (i * 0.618034) % (Math.PI * 2);
      }

      const posAttr = new THREE.BufferAttribute(particlePos, 3);
      posAttr.setUsage(THREE.DynamicDrawUsage);
      const particleGeo = new THREE.BufferGeometry();
      particleGeo.setAttribute('position', posAttr);

      const particlePoints = new THREE.Points(
        particleGeo,
        new THREE.PointsMaterial({
          color,
          size: 0.22,
          transparent: true,
          opacity: 0.88,
          sizeAttenuation: true,
          fog: false,
        }),
      );
      scene.add(particlePoints);

      this.roads.push({
        curve,
        stripeUniforms,
        edgeMats,
        phaseOffset: (portal.position[0] + portal.position[2]) * 0.09,
        particlePoints,
        particleT,
        particleSpeeds,
        particleSeeds,
      });
    }
  }

  private buildRoadCurve(portal: GamePortal): THREE.CatmullRomCurve3 {
    const endPos  = new THREE.Vector3(portal.position[0], 0, portal.position[2]);
    const dir     = new THREE.Vector3().subVectors(endPos, SPAWN).normalize();
    const dist    = SPAWN.distanceTo(endPos);

    const startPt = SPAWN.clone().addScaledVector(dir, PLAZA_RADIUS + 0.5);
    const endPt = new THREE.Vector3(portal.position[0], 0, portal.position[2] + portal.scale[2] / 2 + 1);
    const midPt   = startPt.clone().lerp(endPt, 0.5);

    // Off-centre portals arc inward toward the world centre line (X=0).
    // The centre portal (Temple) curves gently to one side for visual variety.
    if (Math.abs(portal.position[0]) > 1) {
      midPt.x += -Math.sign(portal.position[0]) * dist * 0.06;
    } else {
      midPt.x += dist * 0.12;
    }

    return new THREE.CatmullRomCurve3([startPt, midPt, endPt], false, 'catmullrom', 0.5);
  }

  // ─── Trees ────────────────────────────────────────────────────────────────────
  //
  // Color seed is derived from world position for repeatable candy variants.

  private buildTrees(scene: THREE.Scene): void {
    // [scale, x, z, rotY, type]
    const defs: [number, number, number, number, number][] = [
      // ── near-plaza ring ──
      [0.85, -13,   5,  0.42, 0],
      [1.10,  13,   5,  1.88, 1],
      [0.95, -14,  14,  3.14, 0],
      [1.00,  14,  14,  4.71, 1],
      [0.80,   0,  20,  2.22, 0],
      // ── mid-field ──
      [1.15, -26,  -4,  0.85, 1],
      [0.90, -27,   6,  5.50, 0],
      [1.00, -26, -18,  2.70, 0],
      [1.10,  26,  -4,  1.22, 1],
      [0.85,  27,   6,  3.88, 0],
      [0.95,  26, -18,  0.34, 0],
      [0.90, -12, -24,  4.20, 1],
      [1.05,  12, -24,  1.57, 0],
      // ── far field ──
      [1.20, -10, -43,  2.95, 1],
      [0.80,  10, -43,  5.10, 0],
      [1.30, -32,   2,  1.20, 1],
      [1.00,  32,   2,  3.60, 0],
      [0.90, -18,  22,  0.80, 1],
      [1.10,  18,  22,  4.20, 0],
      [0.75, -35, -28,  2.40, 1],
      [1.05,  35, -28,  5.80, 0],
      [0.95,   4, -50,  1.10, 1],
      // ── near Snake portal ──
      [0.90, -24,  -8,  2.00, 0],
      [0.80, -17, -17,  1.20, 1],
      [0.95, -22, -18,  4.50, 0],
      // ── near Tetris portal ──
      [0.85,  24,  -8,  0.80, 0],
      [0.80,  17, -17,  3.70, 1],
      [0.90,  22, -18,  2.10, 0],
      // ── near Temple portal ──
      [0.85,  -5, -38,  0.50, 1],
      [0.80,   6, -38,  5.20, 0],
      [1.00,  -8, -42,  1.80, 1],
      [0.95,   8, -42,  3.30, 0],
      // ── near plaza ──
      [0.75,  -5,   4,  1.50, 0],
      [0.80,   5,   4,  3.00, 1],
      [0.85,  -3,  20,  2.50, 0],
      [0.90,   4,  19,  4.20, 1],
    ];

    for (const [scale, x, z, rotY] of defs) {
      const seed = Math.abs(x * 7.314 + z * 3.717);
      const tree = new THREE.Group();
      const fallback = buildJellyTree(scale, seed);
      tree.add(fallback);
      tree.position.set(x, 0, z);
      tree.rotation.y = rotY;
      scene.add(tree);
      this.addObstacle(tree);
      const phase = (x * 0.31 + z * 0.17) % (Math.PI * 2);
      const speed = 0.28 + (Math.abs(x + z) * 0.013) % 0.22;
      this.treeGroups.push({ g: tree, phase, speed });
    }
  }

  // ─── Glowing crystals ────────────────────────────────────────────────────────

  private buildCrystals(scene: THREE.Scene): void {
    const defs: [number, number, number, number][] = [
      [-11,   -3, 0x34d399, 4],
      [ 11,   -3, 0x818cf8, 4],
      [  0,  -17, 0xfbbf24, 5],
      [-23,  -14, 0x22d3ee, 3],
      [ 23,  -14, 0xf472b6, 3],
      [ -6,   14, 0xc084fc, 3],
      [  7,   15, 0xa5f3fc, 3],
      [-17,  -34, 0x4ade80, 3],
      [ 17,  -32, 0xa78bfa, 3],
      // portal-coloured clusters near each building
      [-19,   -8, 0x57ff8a, 3],
      [-16,  -16, 0x57ff8a, 3],
      [ 17,   -8, 0xff6bff, 3],
      [ 16,  -16, 0xff6bff, 3],
      [ -3,  -28, 0xffd65c, 4],
      [  4,  -30, 0xffd65c, 3],
    ];

    for (const [x, z, color, count] of defs) {
      const [group, light] = buildCrystalCluster(color, count);
      group.position.set(x, 0, z);
      scene.add(group);
      this.crystalLights.push(light);
      this.addObstacle(group);
    }
  }

  // ─── Decorative props ────────────────────────────────────────────────────────

  private buildProps(scene: THREE.Scene): void {
    // [x, z, color, scale]
    const mushrooms: [number, number, number, number][] = [
      // inner ring
      [-17,  0.0, 0xf9a8d4, 0.90], [-18,  2.5, 0xfda4af, 0.65],
      [ 17,  0.0, 0xa5b4fc, 0.85], [ 18,  2.0, 0xbfdbfe, 0.60],
      [ -8, -7.0, 0xd9f99d, 0.75], [  9, -7.0, 0xfef08a, 0.80],
      [-21, -24,  0x86efac, 0.70], [ 21, -24,  0xc4b5fd, 0.75],
      [  4,  17,  0xf5d0fe, 0.90], [ -5,  16,  0xfde68a, 0.65],
      // outer ring — larger feature mushrooms
      [-30,  -8,  0x6ee7b7, 1.20], [ 30,  -8,  0xfca5a5, 1.15],
      [ -6, -30,  0xfde68a, 1.30], [  6, -30,  0xc4b5fd, 1.10],
      [-22,  10,  0xf0abfc, 1.00], [ 22,  10,  0xa5f3fc, 1.05],
      // near portals
      [-22, -16,  0x57ff8a, 0.70], [-18,  -8,  0x86efac, 0.65],
      [ 22, -16,  0xff6bff, 0.70], [ 18,  -8,  0xf0abfc, 0.65],
      [ -4, -32,  0xffd65c, 0.80], [  5, -32,  0xfde68a, 0.75],
    ];
    for (const [x, z, color, scale] of mushrooms) {
      const m = buildMushroom(color, scale);
      m.position.set(x, 0, z);
      scene.add(m);
      this.addObstacle(m);
    }

    const rockMat = new THREE.MeshPhongMaterial({ color: 0x625281, shininess: 24 });
    const rocks: [number, number, number, number, number][] = [
      [ -9, -2.5, 0.50, 0.35, 0.40],
      [-10, -1.0, 0.35, 0.24, 0.30],
      [  9, -2.0, 0.45, 0.30, 0.38],
      [ 11, -3.0, 0.30, 0.22, 0.34],
      [ -3,  12,  0.55, 0.38, 0.42],
      [  5,  13,  0.40, 0.28, 0.36],
    ];
    for (const [x, z, sx, sy, sz] of rocks) {
      const rock = new THREE.Mesh(new THREE.SphereGeometry(1, 5, 4), rockMat);
      rock.scale.set(sx, sy, sz);
      rock.position.set(x, sy * 0.5, z);
      scene.add(rock);
      this.addObstacle(rock);
    }
  }

  /** Low garden beds frame roads without adding invisible movement barriers. */
  private buildGardens(scene: THREE.Scene): void {
    const garden = new THREE.Group();
    const sphere = new THREE.SphereGeometry(1, 12, 8);
    const transforms: { position: number[]; scale: number[]; color: number }[] = [];
    const beds = [[-12, 1, 2.5], [12, 1, 2.4], [-17, 8, 3], [18, 9, 3],
      [-27, -14, 3.5], [-12, -21, 2.2], [2, -24, 2.5], [19, -24, 2.8],
      [-31, -5, 3], [32, -6, 3], [-12, 18, 2.5], [12, 20, 2.8]];
    for (const [x, z, radius] of beds) {
      transforms.push({position: [x, .025, z], scale: [radius, .16, radius * .7], color: 0x326c68});
      for (let i = 0; i < 20; i++) {
        const a = i * 2.39996, r = radius * Math.sqrt((i + .5) / 20);
        const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r * .65;
        const flower = i % 4 === 0;
        transforms.push({position: [px, flower ? .3 : .18, pz],
          scale: flower ? [.12, .14, .12] : [.22, .12 + (i % 3) * .09, .17],
          color: flower ? [0xffb94f, 0xf87fce, 0xa37af4][i % 3] : [0x5bbf77, 0x92bc49, 0x31958d][i % 3]});
      }
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2;
        transforms.push({position: [x + Math.cos(a) * radius, .14, z + Math.sin(a) * radius * .7],
          scale: [.28, .18, .23], color: i % 2 ? 0x797095 : 0x5c537e});
      }
    }
    const plants = new THREE.InstancedMesh(sphere, new THREE.MeshStandardMaterial({roughness: .65}), transforms.length);
    const dummy = new THREE.Object3D();
    transforms.forEach((part, i) => {
      dummy.position.fromArray(part.position); dummy.scale.fromArray(part.scale); dummy.updateMatrix();
      plants.setMatrixAt(i, dummy.matrix); plants.setColorAt(i, new THREE.Color(part.color));
    });
    plants.receiveShadow = true; plants.castShadow = true; garden.add(plants); scene.add(garden);
  }

  // ─── Ambient particles ───────────────────────────────────────────────────────

  private buildParticles(scene: THREE.Scene): void {
    const COUNT = 200;
    this.particleBaseY = new Float32Array(COUNT);
    this.particleSeeds = new Float32Array(COUNT);
    const pos = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
      const angle  = (i * 2.399963) % (Math.PI * 2);
      const radius = 6 + (i * 0.19) % 38;
      const baseY  = 0.5 + (i * 0.23) % 4.0;

      pos[i * 3]     = Math.cos(angle) * radius;
      pos[i * 3 + 1] = baseY;
      pos[i * 3 + 2] = 8 + Math.sin(angle) * radius;

      this.particleBaseY[i] = baseY;
      this.particleSeeds[i] = (i * 0.618034) % (Math.PI * 2);
    }

    const geo     = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(pos, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);

    this.particles = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xe8d0ff,
        size: 0.055,
        transparent: true,
        opacity: 0.45,
        sizeAttenuation: true,
        fog: false,
      }),
    );
    scene.add(this.particles);
  }

  // ─── Grass particles ─────────────────────────────────────────────────────────
  //
  // 600 ground-level blades scattered in a 12–64 unit ring around the world
  // centre.  Each blade sways independently on three axes to mimic wind.
  // Mint-green colour contrasts the purple world palette.

  private buildGrassParticles(scene: THREE.Scene): void {
    const COUNT        = 600;
    this.grassBaseX    = new Float32Array(COUNT);
    this.grassBaseZ    = new Float32Array(COUNT);
    this.grassSeeds    = new Float32Array(COUNT);
    const pos          = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
      const angle  = (i * 2.399963) % (Math.PI * 2);
      const radius = 12 + (i * 0.237) % 52;
      const bx     = Math.cos(angle) * radius;
      const bz     = 8 + Math.sin(angle) * radius;

      this.grassBaseX[i] = bx;
      this.grassBaseZ[i] = bz;
      this.grassSeeds[i] = (i * 0.618034) % (Math.PI * 2);

      pos[i * 3 + 0] = bx;
      pos[i * 3 + 1] = 0.08 + (i * 0.171) % 0.28;
      pos[i * 3 + 2] = bz;
    }

    const geo     = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(pos, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);

    this.grassParticles = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xa7f3d0,
        size: 0.14,
        transparent: true,
        opacity: 0.72,
        sizeAttenuation: true,
        fog: true,
      }),
    );
    scene.add(this.grassParticles);
  }

  // ─── Distant world elements ──────────────────────────────────────────────────
  //
  // Giant jelly moon, floating islands, and far silhouettes give the world a
  // sense of depth and set-dressing that reads immediately as a real game.

  private buildDistantElements(scene: THREE.Scene): void {
    // ── Jelly moon ──
    // Large translucent sphere high above and behind the 2048 temple.
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0xe0c8ff,
      emissive: 0xc4a0ff,
      emissiveIntensity: 0.55,
      roughness: 0.30,
      transparent: true,
      opacity: 0.80,
      fog: false,
    });
    const moon = new THREE.Mesh(new THREE.SphereGeometry(8, 24, 18), moonMat);
    moon.position.set(55, 78, -180);
    scene.add(moon);

    // Halo sphere — soft outer glow
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xd8b4fe,
      transparent: true,
      opacity: 0.10,
      fog: false,
    });
    const halo = new THREE.Mesh(new THREE.SphereGeometry(9, 16, 12), haloMat);
    halo.position.copy(moon.position);
    scene.add(halo);

    // Dim moon light — casts a cool lavender tint across distant ground
    const moonLight = new THREE.PointLight(0xc4b5fd, 2.0, 220);
    moonLight.position.copy(moon.position);
    scene.add(moonLight);

    // ── Floating islands ──
    // [x, baseY, z, radius]
    const islandDefs: [number, number, number, number][] = [
      [-43, 15, -66, 7],
      [ 46, 19, -74, 6.0],
      [-25, 20, -110, 9.0],
      [ 30, 23, -115, 7.5],
      [-60, 32, -85, 8.0],
    ];
    for (const [x, baseY, z, radius] of islandDefs) {
      const island = new THREE.Group();
      const fallback = buildFloatingIsland(radius);
      island.add(fallback);
      mountGellyModel(island, x < 0 ? 'floating-island' : 'floating-island-with-waterfall', radius * 1.6, fallback);
      island.position.set(x, baseY, z);
      scene.add(island);
      this.islandGroups.push(island);
      this.islandBaseY.push(baseY);
    }

    // ── Background hills ──
    // Rolling hills along the far world edge; squashed spheres give a soft silhouette
    const hillMat = new THREE.MeshStandardMaterial({
      color: 0x444477, roughness: 0.95, emissive: 0x262846, emissiveIntensity: 0.08,
    });
    // [x, z, scaleX, scaleY]
    const hillDefs: [number, number, number, number][] = [
      [-80,  -90, 28, 14],
      [-40, -110, 32, 16],
      [  5, -115, 38, 18],
      [ 48, -105, 30, 15],
      [ 80,  -88, 26, 13],
    ];
    for (const [x, z, rx, ry] of hillDefs) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), hillMat);
      hill.scale.set(rx, ry, rx * 0.7);
      hill.position.set(x, ry * 0.1, z);
      scene.add(hill);
    }

    // ── Distant silhouettes ──
    // Very dark spires at the world edge; visible only as silhouettes through fog.
    const silMat = new THREE.MeshBasicMaterial({ color: 0x0e0325 });
    const spires: [number, number, number, number][] = [
      // [x, z, radius, height]
      [-82,  -78,  6,  28],
      [-60,  -98,  4,  20],
      [-38, -112,  5,  24],
      [ 72,  -82,  7,  32],
      [ 55, -102,  4.5, 22],
      [ 35, -115,  5,  26],
      [  5, -108,  8,  18],  // Wide silhouette behind 2048 temple
    ];
    for (const [x, z, r, h] of spires) {
      const spire = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), silMat);
      spire.position.set(x, h / 2, z);
      // Keep the skyline soft; no pointed mountain silhouettes.
    }
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  update(elapsed: number, delta: number): void {
    // Float particles
    const posAttr = this.particles?.geometry.getAttribute('position') as
      THREE.BufferAttribute | undefined;
    if (posAttr) {
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < this.particleSeeds.length; i++) {
        arr[i * 3 + 1] = this.particleBaseY[i] + Math.sin(elapsed * 0.55 + this.particleSeeds[i]) * 0.9;
      }
      posAttr.needsUpdate = true;
    }

    // Apex crystal
    if (this.centerpieceCrystal) {
      this.centerpieceCrystal.rotation.y += delta * 0.65;
      this.centerpieceCrystal.rotation.x  = Math.sin(elapsed * 0.7) * 0.12;
    }

    // Centerpiece light pulse
    if (this.centerpieceLight) {
      this.centerpieceLight.intensity = 4.2 + Math.sin(elapsed * 1.7) * 1.0;
    }

    // Crystal lights
    for (let i = 0; i < this.crystalLights.length; i++) {
      this.crystalLights[i].intensity = 1.0 + Math.sin(elapsed * 1.5 + i * 1.1) * 0.45;
    }

    // Tree wind sway — gentle two-axis rotation
    for (const t of this.treeGroups) {
      t.g.rotation.z = Math.sin(elapsed * t.speed + t.phase) * 0.028;
      t.g.rotation.x = Math.cos(elapsed * t.speed * 0.7 + t.phase) * 0.014;
    }

    // Floating islands bob up and down
    for (let i = 0; i < this.islandGroups.length; i++) {
      this.islandGroups[i].position.y = this.islandBaseY[i] + Math.sin(elapsed * 0.30 + i * 1.57) * 0.85;
    }

    // Grass sway — each blade oscillates on all three axes at its own frequency
    const grassAttr = this.grassParticles?.geometry.getAttribute('position') as
      THREE.BufferAttribute | undefined;
    if (grassAttr) {
      const arr = grassAttr.array as Float32Array;
      for (let i = 0; i < this.grassSeeds.length; i++) {
        const sp   = 0.32 + (i * 0.017) % 0.30;
        const seed = this.grassSeeds[i];
        arr[i * 3 + 0] = this.grassBaseX[i] + Math.sin(elapsed * sp        + seed) * 0.22;
        arr[i * 3 + 1] = 0.08 + Math.abs(Math.sin(elapsed * sp * 1.5 + seed + 1.2)) * 0.24;
        arr[i * 3 + 2] = this.grassBaseZ[i] + Math.cos(elapsed * sp * 0.85 + seed) * 0.16;
      }
      grassAttr.needsUpdate = true;
    }

    // Magical roads
    for (const road of this.roads) {
      // Advance stripe wave
      road.stripeUniforms.uTime.value = elapsed;

      // Pulse edge rails — each road slightly out of phase
      const pulse = 0.55 + Math.sin(elapsed * 1.9 + road.phaseOffset) * 0.38;
      for (const mat of road.edgeMats) {
        mat.emissiveIntensity = pulse;
      }

      // Advance particles along curve
      const pAttr = road.particlePoints.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr   = pAttr.array as Float32Array;
      for (let i = 0; i < ROAD_PARTICLE_COUNT; i++) {
        road.particleT[i] = (road.particleT[i] + road.particleSpeeds[i] * delta) % 1.0;
        const pt = road.curve.getPoint(road.particleT[i]);
        arr[i * 3 + 0] = pt.x + Math.sin(road.particleSeeds[i] * 4.1) * 0.45;
        arr[i * 3 + 1] = 0.18 + Math.sin(elapsed * 1.8 + road.particleSeeds[i]) * 0.14;
        arr[i * 3 + 2] = pt.z + Math.cos(road.particleSeeds[i] * 3.7) * 0.45;
      }
      pAttr.needsUpdate = true;
    }
  }

  destroy(): void {
    this.obstacles.length = 0;
    this.grassParticles?.geometry.dispose();
    (this.grassParticles?.material as THREE.PointsMaterial | undefined)?.dispose();

    for (const road of this.roads) {
      road.particlePoints.geometry.dispose();
      (road.particlePoints.material as THREE.PointsMaterial).dispose();
      for (const mat of road.edgeMats) mat.dispose();
    }
    this.roads = [];
  }
}
