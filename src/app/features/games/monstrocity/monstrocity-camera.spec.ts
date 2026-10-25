import { MonstrocityScene } from './monstrocity.scene';
import { worldInput } from './monstrocity.input';
describe('Monstrocity camera-relative movement',()=>{
 let scene:any;
 beforeEach(()=>{scene=Object.create(MonstrocityScene.prototype);scene.cameraMode='follow';scene.followYaw=0;});
 it('moves forward into the view and right across the screen',()=>{
  expect(scene.movementInput(0,-1)).toEqual({moveX:0,moveZ:1});
  expect(scene.movementInput(1,0)).toEqual({moveX:-1,moveZ:0});
 });
 it('rotates movement together with the orbit camera without boosting diagonals',()=>{
  scene.followYaw=Math.PI/2;
  const forward=scene.movementInput(0,-1);expect(forward.moveX).toBeCloseTo(1);expect(forward.moveZ).toBeCloseTo(0);
  const diagonal=scene.movementInput(1,-1);expect(Math.hypot(diagonal.moveX,diagonal.moveZ)).toBeCloseTo(1);
 });
 it('preserves overhead controls',()=>{scene.cameraMode='overhead';expect(scene.movementInput(.4,-.8)).toEqual(worldInput(.4,-.8));});
});
