import assert from 'node:assert/strict';
import { build } from 'esbuild';
const compiled = await build({stdin: {contents: `
export { GellyWorldScene } from './src/app/features/world/gelly-world.scene';
export { GellyPlayerController } from './src/app/features/world/gelly-player.controller';
export { GellyHeroRenderer } from './src/app/features/world/gelly/gelly-hero.renderer';
export { GellyCameraController } from './src/app/features/world/gelly-camera.controller';
export { GELLY_PORTALS } from './src/app/features/world/gelly/gelly-portals';
export * as THREE from 'three';`, resolveDir: process.cwd()}, bundle:true, platform:'node', format:'esm', write:false});
const { GellyWorldScene, GellyPlayerController, GellyHeroRenderer, GellyCameraController, GELLY_PORTALS, THREE } =
  await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
globalThis.requestAnimationFrame = () => 1;
for (const portal of GELLY_PORTALS) {
  for (const fps of [5, 60, 120]) {
    const scene = new THREE.Scene();
    const hero = new GellyHeroRenderer();
    const player = new GellyPlayerController(scene, hero);
    const doorZ = portal.position[2] + portal.scale[2] / 2;
    player.position.set(portal.position[0], .15, doorZ + 1.5);
    const camera = new GellyCameraController(16 / 9);
    camera.setMode('first-person');
    player.setFirstPerson(true);
    const routes = [];
    let starts = 0;
    const world = Object.create(GellyWorldScene.prototype);
    Object.assign(world, {
      scene, player, portals: GELLY_PORTALS, nearbyPortal: portal, entry: null,
      input: { getMovement: () => ({ x: 1, z: -1 }) }, cameraController: camera,
      clock: { update() {}, getDelta: () => 1 / fps, getElapsed: () => 0 },
      environment: null, hallAnimations: [], renderer: { render() {} }, css2dRenderer: { render() {} },
      pulseGlows() {}, onNearPortal() {}, onEntryStart() { starts++; },
      onEnterPortal: p => routes.push(p.route),
    });
    world.checkProximity();
    assert.equal(starts, 1, 'Door proximity starts entry automatically');
    assert.equal(hero.mesh.visible, true, 'First-person entry reveals the hero');
    assert.equal(camera.mode, 'third-person');
    const cameraPosition = camera.camera.position.clone();
    const initialHeading = hero.mesh.rotation.y;
    for (let i = 0; i < Math.round(.8 * fps); i++) {
      world.interact(); world.playAction('jump'); world.animate();
    }
    assert.equal(routes.length, 0, 'Never navigate before animation finishes');
    assert.ok(hero.mesh.scale.x < .85, 'Hero shrinks into the door');
    assert.ok(Math.abs(hero.mesh.rotation.y - initialHeading) > Math.PI, 'Hero visibly spins');
    assert.ok(player.position.y > .5, 'Hero lifts into the vortex');
    assert.ok(camera.camera.position.equals(cameraPosition), 'Camera does not spin with the hero');
    for (let i = 0; i < fps * 2; i++) world.animate();
    assert.deepEqual(routes, [portal.route], 'Enter the matching game exactly once');
    assert.equal(starts, 1);
    assert.equal(hero.mesh.visible, false);
    assert.ok(player.position.distanceTo(new THREE.Vector3(portal.position[0], 1.65, doorZ + .4)) < 1e-6);
    assert.ok(hero.mesh.scale.x <= .001);
    world.entry.vortex.destroy();
    hero.destroy();
  }
  console.log(`PASS: ${portal.name} → ${portal.route}, automatic entry, spiral, delayed navigation at 5/60/120 FPS`);
}
