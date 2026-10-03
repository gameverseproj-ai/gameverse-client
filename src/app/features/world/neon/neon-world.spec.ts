import * as THREE from 'three';
import { GellyWorldScene } from '../gelly-world.scene';
import { NEON_PORTALS } from './neon-portals';
import { NeonHeroRenderer } from './neon-hero.renderer';
import { NeonEnvironment } from './neon-environment';

// Exercise entry behavior without constructing a WebGL renderer.
describe('Neon world prototype', () => {
  it('does not auto-enter the reserved game when the hero reaches its door', () => {
    const portal = NEON_PORTALS[0];
    const scene = Object.create(GellyWorldScene.prototype) as any;
    Object.assign(scene, {
      entry: null, portals: NEON_PORTALS, nearbyPortal: portal,
      player: { position: new THREE.Vector3(0, 0, portal.position[2] + portal.scale[2] / 2 + 1) },
    });
    scene.beginEntry = jasmine.createSpy('beginEntry');
    scene.checkProximity();
    expect(scene.beginEntry).not.toHaveBeenCalled();
  });

  it('ignores interaction with the reserved entrance', () => {
    const scene = Object.create(GellyWorldScene.prototype) as any;
    Object.assign(scene, { entry: null, nearbyPortal: NEON_PORTALS[0], onEntryStart: jasmine.createSpy('onEntryStart') });
    // An available entrance would touch the camera and player here.
    expect(() => scene.interact()).not.toThrow();
    expect(scene.onEntryStart).not.toHaveBeenCalled();
    expect(scene.entry).toBeNull();
  });

  it('builds and disposes the robot and city, with stable animated transforms', () => {
    const scene = new THREE.Scene();
    const hero = new NeonHeroRenderer();
    const city = new NeonEnvironment();
    hero.build(scene); city.build(scene);
    hero.playAction('jump');
    for (let i = 0; i < 120; i++) {
      hero.update(1 / 60, { x: 0, z: -1 }, i / 60);
      city.update(i / 60, 1 / 60);
    }
    const eyes = new THREE.Vector3(); hero.getEyePosition(eyes);
    expect(eyes.toArray().every(Number.isFinite)).toBeTrue();
    expect(city.obstacles.some(o => Math.abs(o.x) < 6 && o.z > -17)).toBeFalse();
    hero.destroy(); city.destroy();
    expect(scene.children.length).toBe(0);
  });
});
