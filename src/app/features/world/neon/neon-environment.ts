import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { WorldEnvironment } from '../../../shared/world/world-environment.interface';
import { WorldObstacle } from '../../../shared/world/world-obstacle.model';
import { disposeObject } from '../gelly/gelly-models';

/** A luminous archipelago: gardens, little shelters and suspended islands. */
export class NeonEnvironment implements WorldEnvironment {
  readonly obstacles: WorldObstacle[] = [];
  private readonly root = new THREE.Group();
  private readonly floating: THREE.Object3D[] = [];
  private readonly rotating: THREE.Object3D[] = [];
  private readonly pulses: THREE.Mesh[] = [];
  private readonly stone = new THREE.MeshStandardMaterial({ color: 0x526780, roughness: .8, metalness: .05, emissive: 0x283c57, emissiveIntensity: .3 });
  private readonly ceramic = new THREE.MeshStandardMaterial({ color: 0x8297b0, roughness: .6, emissive: 0x344663, emissiveIntensity: .25 });
  private readonly teal = new THREE.MeshStandardMaterial({ color: 0x3b8791, roughness: .65, emissive: 0x184d5b, emissiveIntensity: .3 });
  private readonly cyan = new THREE.MeshBasicMaterial({ color: 0x4cf1ff });
  private readonly pink = new THREE.MeshBasicMaterial({ color: 0xf15aff });
  private readonly ice = new THREE.MeshBasicMaterial({ color: 0x89cfff });
  private readonly path = new THREE.MeshStandardMaterial({ color: 0x3c576d, roughness: .7, emissive: 0x20384c, emissiveIntensity: .25 });

  private mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z); mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }

  private ring(parent: THREE.Object3D, radius: number, x: number, y: number, z: number, material: THREE.Material): THREE.Mesh {
    const ring = this.mesh(parent, new THREE.TorusGeometry(radius, .06, 6, 48), material, x, y, z);
    ring.rotation.x = -Math.PI / 2; return ring;
  }

  private profile(points: number[][]): THREE.LatheGeometry {
    const curve = new THREE.SplineCurve(points.map(([r, y]) => new THREE.Vector2(r, y)));
    return new THREE.LatheGeometry(curve.getPoints(24), 32);
  }

  private tree(parent: THREE.Object3D, x: number, y: number, z: number, scale = 1): void {
    const tree = new THREE.Group(); tree.position.set(x, y, z); tree.scale.setScalar(scale); parent.add(tree);
    const trunk = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(.12, 1.2, 0), new THREE.Vector3(-.15, 2.5, .1)]);
    this.mesh(tree, new THREE.TubeGeometry(trunk, 12, .18, 8, false), this.stone, 0, 0, 0);
    for (let i = 0; i < 3; i++) {
      const px = i === 0 ? 0 : i === 1 ? -.85 : .8;
      const py = i === 0 ? 3.1 : 2.65;
      const branch = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 1.3, 0), new THREE.Vector3(px * .6, 1.9, 0), new THREE.Vector3(px, py, 0)]);
      this.mesh(tree, new THREE.TubeGeometry(branch, 8, .1, 6, false), this.stone, 0, 0, 0);
      const crown = this.mesh(tree, new THREE.SphereGeometry(1, 20, 12), i === 1 ? this.ceramic : this.teal, px, py, 0);
      crown.scale.set(i ? .85 : 1.05, i ? .8 : 1.25, .85);
      const fruit = this.mesh(tree, new THREE.SphereGeometry(.13, 10, 8), this.ice, px + .32, py -.5, .65);
      fruit.scale.y = 1.3;
    }
    this.ring(tree, 1.05, 0, 2.7, 0, this.cyan);
  }

  private shelter(parent: THREE.Object3D, x: number, y: number, z: number, scale = 1): void {
    const house = new THREE.Group(); house.position.set(x, y, z); house.scale.setScalar(scale); parent.add(house);
    this.mesh(house, this.profile([[0,0],[2.2,0],[2.45,.15],[2.35,.32],[0,.34]]), this.stone, 0, 0, 0);
    this.mesh(house, this.profile([[0,0],[1.85,0],[2,.5],[2,1.8],[1.8,2.7],[0,2.7]]), this.ceramic, 0, .3, 0);
    // Overhanging, curved ceramic roof with a turned-up lip and inset ribs.
    this.mesh(house, this.profile([[0,0],[2.45,0],[2.6,.15],[2.25,.4],[1.6,1],[.65,1.5],[0,1.6]]), this.teal, 0, 2.85, 0);
    this.ring(house, 2.52, 0, 3.02, 0, this.pink);
    this.ring(house, 1.78, 0, 3.69, 0, this.teal);
    for (const side of [-1, 1]) {
      const window = new THREE.Group(); window.position.set(side * .88, 1.8, 1.75); window.rotation.y = side * .4; house.add(window);
      this.mesh(window, new THREE.TorusGeometry(.48, .1, 8, 24), this.stone, 0, 0, 0);
      this.mesh(window, new THREE.CircleGeometry(.43, 24), this.ice, 0, 0, .025);
      this.mesh(window, new RoundedBoxGeometry(.06,.78,.07,2,.025), this.stone, 0, 0, .06);
      this.mesh(window, new RoundedBoxGeometry(.78,.06,.07,2,.025), this.stone, 0, 0, .06);
    }
    this.mesh(house, new THREE.SphereGeometry(.25, 16, 10), this.ice, 0, 4.62, 0);
    this.ring(house, 1.96, 0, .6, 0, this.pink);
  }

  private island(x: number, y: number, z: number, radius: number, house: boolean): void {
    const island = new THREE.Group(); island.position.set(x, y, z); this.root.add(island);
    const geometry = this.profile([[0,-1.15],[.2,-1],[.55,-.75],[.82,-.4],[1,-.08],[.98,0],[0,0]]);
    const positions = geometry.attributes['position'];
    for (let i=0; i<positions.count; i++) {
      const px=positions.getX(i), pz=positions.getZ(i), angle=Math.atan2(pz,px);
      const uneven=1 + .06*Math.sin(angle*3) + .035*Math.cos(angle*5);
      positions.setXYZ(i, px*radius*uneven, positions.getY(i)*radius, pz*radius*uneven);
    }
    geometry.computeVertexNormals();
    this.mesh(island, geometry, this.stone, 0, 0, 0);
    const grass=this.mesh(island,new THREE.SphereGeometry(1,32,12),this.teal,0,0,0);
    grass.scale.set(radius,.34,radius);
    this.ring(island, radius * .97, 0, .12, 0, this.cyan);
    this.ring(island, radius * .72, 0, -radius*.5, 0, this.ceramic);
    const jewel=this.mesh(island,new THREE.SphereGeometry(.35,12,8),this.ice,0,-radius*1.18,0); jewel.scale.y=1.7;
    if (house) this.shelter(island, -.4, .3, 0, .85);
    else this.tree(island, 0, .3, 0, 1.4);
    this.tree(island, radius * .5, .3, .6, .6);
    island.userData['baseY'] = y; this.floating.push(island);
  }

  private garden(x: number, z: number, material: THREE.Material): void {
    this.mesh(this.root, this.profile([[0,0],[2.6,0],[2.9,.12],[2.8,.3],[0,.3]]), this.stone, x, .15, z);
    this.ring(this.root, 2.7, x, .33, z, material);
    for (let i = 0; i < 5; i++) {
      const angle = i * 2.4, height = 1.3 + i % 3 * .5;
      const crystal = this.mesh(this.root, new THREE.OctahedronGeometry(1), i % 2 ? this.ceramic : material,
        x + Math.sin(angle) * 1.5, height * .65, z + Math.cos(angle) * 1.5);
      crystal.scale.set(.35, height, .35); crystal.rotation.z = Math.sin(i) * .2;
    }
    this.obstacles.push({ x, z, halfWidth: 2.8, halfDepth: 2.8 });
  }

  build(scene: THREE.Scene): void {
    // Flat walkable plaza and stepping stones retain the existing movement plane.
    const plaza = this.mesh(this.root, new THREE.CircleGeometry(7, 64), this.path, 0, .035, 8);
    plaza.rotation.x = -Math.PI / 2;
    this.ring(this.root, 6.8, 0, .07, 8, this.cyan);
    this.ring(this.root, 6.4, 0, .07, 8, this.ceramic);
    for (let i = 0; i < 13; i++) {
      this.mesh(this.root, new THREE.BoxGeometry(8, .035, 1.55), this.path, 0, .045, 1 - i * 1.4);
      for (const side of [-1, 1]) this.mesh(this.root, new THREE.BoxGeometry(.15, .04, 1.15), i % 3 ? this.cyan : this.pink, side * 4.2, .08, 1 - i * 1.4);
    }
    // Small nearby destinations bring detail into the first camera view.
    this.shelter(this.root, -12, 0, -6);
    this.obstacles.push({ x: -12, z: -6, halfWidth: 2.6, halfDepth: 2.6 });
    this.shelter(this.root, 14, 0, -15, 1.2);
    this.obstacles.push({ x: 14, z: -15, halfWidth: 3.2, halfDepth: 3.2 });
    this.garden(-9, 3, this.cyan); this.garden(10, -4, this.pink);
    this.garden(-12, -19, this.ice); this.garden(11, 12, this.cyan);
    for (let i = 0; i < 10; i++) {
      const side = i % 2 ? -1 : 1, x = side * (17 + i % 3 * 2), z = 15 - i * 5;
      this.tree(this.root, x, 0, z, .8 + i % 3 * .2);
      this.obstacles.push({ x, z, halfWidth: .55, halfDepth: .55 });
    }
    // Low benches and luminous lamps give the world a human scale.
    for (const side of [-1, 1]) {
      this.mesh(this.root, new RoundedBoxGeometry(3, .4, 1, 3, .18), this.ceramic, side * 9, .65, 8);
      for (const dz of [-.3, .3]) this.mesh(this.root, new THREE.BoxGeometry(2.3, .5, .12), this.stone, side * 9, .25, 8 + dz);
      this.obstacles.push({ x: side * 9, z: 8, halfWidth: 1.5, halfDepth: .5 });
      for (let i = 0; i < 4; i++) {
        const x = side * 6, z = 4 - i * 6;
        this.mesh(this.root, new THREE.CylinderGeometry(.09, .15, 1.5, 6), this.ceramic, x, .75, z);
        this.mesh(this.root, new THREE.IcosahedronGeometry(.3, 1), this.ice, x, 1.6, z);
        this.obstacles.push({ x, z, halfWidth: .2, halfDepth: .2 });
      }
    }
    // A levitating orrery: a distinct landmark beside the main entrance.
    const orb = new THREE.Group(); orb.position.set(-20, 5, -31); this.root.add(orb);
    this.mesh(orb, new THREE.SphereGeometry(1.6, 24, 16), this.teal, 0, 0, 0);
    for (let i = 0; i < 3; i++) {
      const orbit = this.ring(orb, 2.4 + i * .6, 0, 0, 0, i % 2 ? this.pink : this.cyan);
      orbit.rotation.set(i * .7, i * .8, .4); this.rotating.push(orbit);
    }
    this.mesh(this.root, new THREE.CylinderGeometry(3.5, 4.5, .6, 10), this.stone, -20, .3, -31);
    this.obstacles.push({ x: -20, z: -31, halfWidth: 4.5, halfDepth: 4.5 });
    this.island(-26, 10, -30, 5, true);
    this.island(27, 13, -39, 6, true);
    this.island(-17, 18, -58, 4, false);
    this.island(10, 24, -75, 7, true);
    this.island(34, 7, 0, 4, false);
    this.island(-32, 8, 12, 4, false);
    for (let i = 0; i < 8; i++) {
      const pulse = this.mesh(this.root, new THREE.SphereGeometry(.07, 6, 4), this.cyan, i % 2 ? 4.2 : -4.2, .2, 0);
      this.pulses.push(pulse);
    }
    scene.add(this.root);
  }
  update(time: number, delta: number): void {
    this.pulses.forEach((pulse, i) => pulse.position.z = 5 - ((time * 3 + i * 3) % 23));
    this.floating.forEach((island, i) => island.position.y = island.userData['baseY'] + Math.sin(time * .55 + i) * .35);
    this.rotating.forEach((orbit, i) => orbit.rotation.y += delta * (.15 + i * .08));
  }
  destroy(): void { disposeObject(this.root); this.root.removeFromParent(); }
}
