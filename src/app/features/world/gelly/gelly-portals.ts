import * as THREE from 'three';
import { GamePortal } from '../../../shared/world/game-portal.model';

export const GELLY_PORTALS: GamePortal[] = [
  {
    id: 'snake',
    name: 'Snake Hall',
    route: '/games/snake',
    position: [-8, 0, -3],
    scale: [5, 10, 5],
    color: 0x22c55e,
    buildGroup() {
      const group = new THREE.Group();
      const [w, h] = this.scale;
      const color = new THREE.Color(this.color);
      const mat = new THREE.MeshPhongMaterial({
        color,
        emissive: color.clone().multiplyScalar(0.15),
        shininess: 80,
      });

      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(w / 2, (w / 2) * 1.1, h, 8),
        mat,
      );
      tower.position.y = h / 2;
      tower.castShadow = true;
      group.add(tower);

      const coilMat = new THREE.MeshPhongMaterial({
        color: color.clone().multiplyScalar(0.65),
        shininess: 40,
      });
      for (const yFrac of [0.25, 0.55]) {
        const coil = new THREE.Mesh(
          new THREE.TorusGeometry(w / 2 + 0.9, 0.35, 8, 32),
          coilMat,
        );
        coil.position.y = h * yFrac;
        coil.rotation.x = Math.PI / 2;
        group.add(coil);
      }

      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      const eyeGeo = new THREE.SphereGeometry(0.22, 8, 8);
      for (const ex of [-0.45, 0.45]) {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(ex, h * 0.88, w / 2 - 0.15);
        group.add(eye);
      }

      const glow = new THREE.PointLight(this.color, 1.8, 22);
      glow.position.set(0, h * 0.5, 0);
      group.add(glow);

      return group;
    },
  },

  {
    id: 'tetris',
    name: 'Tetris Factory',
    route: '/games/tetris',
    position: [8, 0, -3],
    scale: [7, 12, 7],
    color: 0x7c3aed,
    buildGroup() {
      const group = new THREE.Group();
      const [w, h, d] = this.scale;
      const color = new THREE.Color(this.color);
      const mat = new THREE.MeshPhongMaterial({
        color,
        emissive: color.clone().multiplyScalar(0.12),
        shininess: 60,
      });

      const bodyH = h * 0.85;
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, bodyH, d), mat);
      body.position.y = bodyH / 2;
      body.castShadow = true;
      group.add(body);

      const chimneyMat = new THREE.MeshPhongMaterial({ color: color.clone().multiplyScalar(0.5) });
      const chimneyDefs: [number, number][] = [[-w * 0.28, 2.2], [0, 3.0], [w * 0.28, 1.8]];
      for (const [cx, ch] of chimneyDefs) {
        const chimney = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.42, ch, 8),
          chimneyMat,
        );
        chimney.position.set(cx, bodyH + ch / 2, 0);
        group.add(chimney);
      }

      const blockColors = [0x00f0f0, 0xf0a000, 0xf00000, 0x0000f0, 0x00f000];
      const blockDefs: [number, number][] = [
        [-w * 0.30, h * 0.65], [ w * 0.25, h * 0.70],
        [-w * 0.10, h * 0.45], [ w * 0.30, h * 0.45],
        [-w * 0.30, h * 0.25],
      ];
      blockDefs.forEach(([bx, by], i) => {
        const block = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 0.9, 0.35),
          new THREE.MeshBasicMaterial({ color: blockColors[i % blockColors.length] }),
        );
        block.position.set(bx, by, d / 2 + 0.18);
        group.add(block);
      });

      const glow = new THREE.PointLight(this.color, 1.8, 25);
      glow.position.set(0, h * 0.45, 0);
      group.add(glow);

      return group;
    },
  },

  {
    id: '2048',
    name: '2048 Temple',
    route: '/games/2048',
    position: [0, 0, -15],
    scale: [10, 8, 10],
    color: 0xf59e0b,
    buildGroup() {
      const group = new THREE.Group();
      const [w, h, d] = this.scale;
      const color = new THREE.Color(this.color);

      const mkMat = (brightness: number) => new THREE.MeshPhongMaterial({
        color: color.clone().multiplyScalar(brightness),
        emissive: color.clone().multiplyScalar(brightness * 0.1),
        shininess: 90,
      });

      const tiers: [number, number, number, number][] = [
        [w,        h * 0.35, d,        0        ],
        [w * 0.72, h * 0.35, d * 0.72, h * 0.35 ],
        [w * 0.44, h * 0.30, d * 0.44, h * 0.70 ],
      ];
      tiers.forEach(([tw, th, td, ty], i) => {
        const tier = new THREE.Mesh(new THREE.BoxGeometry(tw, th, td), mkMat(1 - i * 0.12));
        tier.position.y = ty + th / 2;
        tier.castShadow = true;
        group.add(tier);
      });

      const pillarH = h * 0.42;
      const pillarMat = mkMat(0.8);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]) {
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.38, 0.46, pillarH, 8),
          pillarMat,
        );
        pillar.position.set(sx * w * 0.48, pillarH / 2, sz * d * 0.48);
        group.add(pillar);
      }

      const orbMat = new THREE.MeshStandardMaterial({
        color: this.color,
        emissive: this.color,
        emissiveIntensity: 1.5,
        roughness: 0.1,
        metalness: 0.3,
      });
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 16), orbMat);
      orb.position.y = h + 0.7;
      group.add(orb);

      const glow = new THREE.PointLight(this.color, 1.8, 28);
      glow.position.set(0, h * 0.5, 0);
      group.add(glow);

      return group;
    },
  },
];
