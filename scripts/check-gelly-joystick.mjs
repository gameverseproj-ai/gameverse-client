import assert from 'node:assert/strict';
import { build } from 'esbuild';

const result = await build({
  entryPoints: ['src/app/features/world/gelly-joystick.controller.ts'],
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const { GellyJoystickController } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
let state;
let movement = [0, 0];
const joystick = new GellyJoystickController(value => state = value, (x, z) => movement = [x, z], 20);
const hold = () => new Promise(resolve => setTimeout(resolve, 40));

// Short taps never create a control, including after the original hold deadline.
joystick.start(1, 300, 200);
joystick.end(1);
await hold();
assert.equal(state.visible, false);
assert.deepEqual(movement, [0, 0]);

// It can originate on either half of the screen, and clamps a diagonal drag.
for (const x of [20, 900]) {
  assert.equal(joystick.start(2, x, 280), true);
  assert.equal(joystick.start(3, 0, 0), false);
  await hold();
  assert.equal(state.visible, true);
  assert.equal(state.originX, x);
  assert.equal(state.originY, 280);
  joystick.move(2, x + 300, 580);
  assert.ok(Math.abs(Math.hypot(...movement) - 1) < .00001);
  joystick.end(3); // An unrelated finger must not end movement.
  assert.equal(state.visible, true);
  joystick.end(2);
  assert.equal(state.visible, false);
  assert.deepEqual(movement, [0, 0]);
}

// Cancellation/backgrounding clears a pending hold and an active joystick.
joystick.start(4, 30, 30);
joystick.reset();
await hold();
assert.equal(state.visible, false);
joystick.start(5, 40, 40);
await hold();
joystick.move(5, 84, 40);
assert.ok(movement[0] > .60 && movement[0] < .62, '44 pixels no longer saturates steering');
joystick.move(5, 112, 40);
assert.deepEqual(movement, [1, 0]);
joystick.move(5, 512, 40);
assert.equal(movement[0],1);
joystick.move(5, 492, 40);
assert.ok(movement[0]<.75,'Returning from an overdrag responds immediately');
joystick.move(5, 440, 40);
assert.ok(Math.abs(movement[0])<1e-10,'No hidden saturated range to retrace');
joystick.reset();
assert.equal(state.visible, false);
assert.deepEqual(movement, [0, 0]);
joystick.start(6, 100, 100);
joystick.move(6, 120, 100);
assert.equal(state.visible, true, 'Dragging activates without waiting for long press');
assert.ok(movement[0] > 0);
joystick.end(6);
assert.deepEqual(movement, [0, 0]);
await hold();
assert.equal(state.visible, false, 'Cancelled hold cannot reactivate after release');
console.log('PASS: short tap, long press, arbitrary origins, drag clamping, multiple pointers, release and cancellation.');
