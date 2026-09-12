import assert from 'node:assert/strict';
import { build } from 'esbuild';

const compiled = await build({
  stdin: { contents: `
    export { GellyWorldScene } from './src/app/features/world/gelly-world.scene';
    export { GellyPlayerController } from './src/app/features/world/gelly-player.controller';
    export { GellyInputController } from './src/app/features/world/gelly-input.controller';
    export * as THREE from 'three';`, resolveDir: process.cwd() },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const { GellyWorldScene, GellyPlayerController, GellyInputController, THREE } =
  await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);

// Exercise the real input, scene timing and player collision path without WebGL.
const listeners = new Map();
globalThis.window = {
  addEventListener: (name, fn) => listeners.set(name, fn),
  removeEventListener: name => listeners.delete(name),
};
globalThis.requestAnimationFrame = () => 1;
function simulate(fps, { sprint = false, turn = false, obstacles = [], seconds = 2 } = {}) {
  const input = new GellyInputController(() => {});
  for (const code of ['KeyW', ...(sprint ? ['ShiftLeft'] : []), ...(turn ? ['KeyD'] : [])]) {
    listeners.get('keydown')({ code });
  }
  const player = new GellyPlayerController(new THREE.Scene(), {
    mesh: new THREE.Group(), spawnY: 0, build() {}, update() {}, destroy() {},
  }, obstacles);
  const world = Object.create(GellyWorldScene.prototype);
  Object.assign(world, {
    input, player, clock: { update() {}, getDelta: () => 1 / fps, getElapsed: () => 0 },
    cameraController: { update() {} }, environment: null, hallAnimations: [],
    renderer: { render() {} }, css2dRenderer: { render() {} },
    checkProximity() {}, pulseGlows() {},
  });
  for (let frame = 0; frame < Math.round(fps * seconds); frame++) world.animate();
  input.destroy();
  return player;
}
const reference = simulate(60);
assert.ok(8 - reference.position.z > 15, 'Walking should cover over 15 units in two seconds');
for (const fps of [4, 5, 10, 15, 20, 30, 60, 120]) {
  const player = simulate(fps);
  assert.ok(player.position.distanceTo(reference.position) < .04, `${fps} FPS must preserve walking speed`);
  const sprint = simulate(fps, { sprint: true });
  assert.ok(Math.abs((8 - sprint.position.z) / (8 - player.position.z) - 1.6) < .001);
  const turning = simulate(fps, { turn: true });
  assert.ok(turning.position.distanceTo(simulate(60, { turn: true }).position) < .12);
  const blocked = simulate(fps, {
    sprint: true, obstacles: [{ x: 0, z: 4, halfWidth: 5, halfDepth: .05 }],
  });
  assert.ok(blocked.position.z >= 4.7, 'Cannot pass through a thin wall');
  assert.ok(blocked.position.z < 5, 'Can approach the wall');
  console.log(`${fps} FPS: ${(8 - player.position.z).toFixed(2)} units walked in 2 seconds`);
}
const stalled = simulate(.2, { seconds: 5 });
assert.ok(8 - stalled.position.z <= 2 + 1e-9, 'A five-second stall must not teleport the player');
// All former edges are traversable; only actual obstacle footprints stop movement.
for (const heading of [0, Math.PI/2, Math.PI, -Math.PI/2]) {
 const player = new GellyPlayerController(new THREE.Scene(), {
  mesh:new THREE.Group(),spawnY:0,build(){},update(){},destroy(){},
 });
 player.heading=heading;
 const start=player.position.clone();
 for(let i=0;i<6000;i++)player.update(1/60,{x:0,z:-1});
 assert.ok(player.position.distanceTo(start)>799,'No invisible boundary in any direction');
}
const backdrop=Object.create(GellyWorldScene.prototype);
Object.assign(backdrop,{cameraController:{camera:{position:new THREE.Vector3(10000,5,-10000)}},
 endlessGround:new THREE.Group(),skyDome:new THREE.Group(),groundSpacing:5});
backdrop.updateEndlessBackdrop();
assert.equal(backdrop.endlessGround.position.x,10000);
assert.equal(backdrop.endlessGround.position.z,-10000);
assert.ok(backdrop.skyDome.position.equals(backdrop.cameraController.camera.position));
backdrop.cameraController.camera.position.x+=1;
backdrop.updateEndlessBackdrop();
assert.equal(backdrop.endlessGround.position.x,10000,'Grid stays fixed between whole-cell shifts');
console.log('PASS: unrestricted travel, endless backdrop, scene timing, keyboard movement, sprint, steering, collisions and stall protection.');
