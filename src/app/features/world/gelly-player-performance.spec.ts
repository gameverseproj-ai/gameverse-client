import * as THREE from 'three';
import { GellyPlayerController } from './gelly-player.controller';
import { HeroRenderer } from '../../shared/world/hero-renderer.interface';

describe('Player simulation on slow frames', () => {
  function player() {
    const update = jasmine.createSpy('animate');
    const renderer = {mesh:new THREE.Group(), spawnY:0, build:()=>{}, update, destroy:()=>{}} as unknown as HeroRenderer;
    return {controller:new GellyPlayerController(new THREE.Scene(), renderer), update};
  }
  it('keeps movement distance while updating the visual rig once per slow frame', () => {
    const fast = player(), slow = player();
    const movement = {x:.4, z:-1};
    for (let frame = 0; frame < 60; frame++) fast.controller.update(1/60,movement);
    for (let frame = 0; frame < 20; frame++) {
      for (let step = 0; step < 3; step++) slow.controller.update(1/60,movement,step === 2 ? 1/20 : 0);
    }
    expect(slow.controller.position.distanceTo(fast.controller.position)).toBeLessThan(.000001);
    expect(slow.controller.heading).toBeCloseTo(fast.controller.heading,8);
    expect(slow.update).toHaveBeenCalledTimes(20);
    expect(fast.update).toHaveBeenCalledTimes(60);
  });
});
