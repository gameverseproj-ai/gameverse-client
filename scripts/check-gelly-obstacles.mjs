import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
const compiled = await build({
  stdin: { contents: `
    export { GellyEnvironment } from './src/app/features/world/gelly/gelly-environment';
    export { GellyPlayerController } from './src/app/features/world/gelly-player.controller';
    export { GELLY_PORTALS } from './src/app/features/world/gelly/gelly-portals';
    export { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    export * as THREE from 'three';`, resolveDir: process.cwd() },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const {GellyEnvironment, GellyPlayerController, GELLY_PORTALS, THREE, GLTFLoader} =
  await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const pending = [];
GLTFLoader.prototype.load = function(url, onLoad) {
  const data = readFileSync(`public${url}`);
  pending.push(this.parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '').then(onLoad));
};
const environment = new GellyEnvironment(GELLY_PORTALS);
environment.build(new THREE.Scene());
const obstacles = environment.obstacles;
const initialTreeWidth = obstacles[6].halfWidth;
await Promise.all(pending);
assert.notEqual(obstacles[6].halfWidth, initialTreeWidth, 'Collider refreshes when the real tree model replaces the fallback');
assert.equal(obstacles.length, 85, 'Trees, crystal clusters, mushrooms, rocks and plaza bollards are solid');
const inside = (x, z, o) => Math.abs(x - o.x) < o.halfWidth + .65 && Math.abs(z - o.z) < o.halfDepth + .65;
assert.ok(!obstacles.some(o => inside(0, 8, o)), 'Spawn stays clear');
function playerFor(solids) {
  return new GellyPlayerController(new THREE.Scene(), {
    mesh: new THREE.Group(), spawnY: 0, build() {}, update() {}, destroy() {},
  }, solids);
}
const buildings = GELLY_PORTALS.map(p => ({x:p.position[0], z:p.position[2], halfWidth:p.scale[0]/2, halfDepth:p.scale[2]/2}));
for (const o of [...obstacles, ...buildings]) {
  for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const player = playerFor([o]);
    player.position.set(o.x + dx * (o.halfWidth + 2), 0, o.z + dz * (o.halfDepth + 2));
    player.heading = Math.atan2(-dx, -dz);
    for (let i = 0; i < 90; i++) {
      player.update(1/60, {x:0, z:-1.6});
      assert.ok(!inside(player.position.x, player.position.z, o), 'Sprinting cannot pass through props from any side');
    }
  }
}
const box = {x:0, z:0, halfWidth:2, halfDepth:2};
const sliding = playerFor([box]);
sliding.position.set(0, 0, 2.66);
sliding.heading = Math.PI * .75;
for (let i = 0; i < 60; i++) {
  sliding.update(1/60, {x:0,z:-1});
  assert.ok(!inside(sliding.position.x, sliding.position.z, box));
}
assert.ok(sliding.position.x > 4 && sliding.position.z < 2, 'Can slide along the front and go around a corner');
for (const p of GELLY_PORTALS) {
  const x = p.position[0], z = p.position[2] + p.scale[2]/2 + 2;
  const entranceClear = [-1, -.5, 0, .5, 1].some(dx => [0, -.5, -1].some(dz => Math.hypot(dx, 2 + dz) < 2.1 && ![...obstacles, ...buildings].some(o => inside(x + dx, z + dz, o))));
  assert.ok(entranceClear, `${p.name} entry trigger remains reachable`);
}
const escaping = playerFor([box]);
escaping.position.set(0, 0, 0);
for (let i = 0; i < 60; i++) escaping.update(1/60, {x:0,z:-1});
assert.ok(escaping.position.z < -3, 'Can escape if a loaded model expands around the player');
environment.destroy();
assert.equal(obstacles.length, 0);
console.log('PASS: 85 environment props + 4 buildings, four-sided sprint collisions, sliding around corners, clear spawn and all door triggers.');
