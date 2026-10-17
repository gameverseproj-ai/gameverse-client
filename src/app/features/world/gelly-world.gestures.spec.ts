import { signal } from '@angular/core';
import { GellyWorldComponent } from './gelly-world.component';

describe('World double tap', () => {
  let component: GellyWorldComponent;
  let surface: HTMLDivElement;
  let scene: { isPlayerAt: jasmine.Spy; playAction: jasmine.Spy; orbitCamera: jasmine.Spy };
  function pointer(type: string, time: number, x = 200): PointerEvent {
    const event = new PointerEvent(type, { pointerId: 1, pointerType: 'touch', clientX: x, clientY: 200 });
    Object.defineProperties(event, { currentTarget: { value: surface }, target: { value: surface }, timeStamp: { value: time } });
    return event;
  }
  function tap(start: number): void {
    component.onPointerDown(pointer('pointerdown', start));
    component.onPointerEnd(pointer('pointerup', start + 50));
  }
  beforeEach(() => {
    // Exercise the gesture handlers without creating a WebGL world or network session.
    component = Object.create(GellyWorldComponent.prototype);
    scene = { isPlayerAt: jasmine.createSpy().and.returnValue(true), playAction: jasmine.createSpy(), orbitCamera: jasmine.createSpy() };
    Object.assign(component, { scene, enteringPortal: signal(null), mobileControls: signal(false), movementPointer: null, cameraPointer: null, lastPlayerTap: null });
    surface = document.createElement('div');
    spyOn(surface, 'getBoundingClientRect').and.returnValue(new DOMRect(0, 0, 400, 800));
    spyOn(surface, 'setPointerCapture');
    spyOn(surface, 'hasPointerCapture').and.returnValue(false);
  });
  it('jumps once for two short taps on the character', () => {
    tap(0);
    expect(scene.playAction).not.toHaveBeenCalled();
    tap(150);
    expect(scene.playAction).toHaveBeenCalledOnceWith('jump');
  });
  it('does not jump on the background or after the double tap window', () => {
    scene.isPlayerAt.and.returnValue(false);
    tap(0); tap(150);
    scene.isPlayerAt.and.returnValue(true);
    tap(500); tap(1100);
    expect(scene.playAction).not.toHaveBeenCalled();
  });
  it('treats dragging as camera movement and cancellation as no tap', () => {
    tap(0);
    component.onPointerDown(pointer('pointerdown', 150));
    component.onPointerMove(pointer('pointermove', 180, 240));
    component.onPointerEnd(pointer('pointerup', 200, 240));
    expect(scene.orbitCamera).toHaveBeenCalled();
    expect(scene.playAction).not.toHaveBeenCalled();
    component.onPointerDown(pointer('pointerdown', 250));
    component.onPointerEnd(pointer('pointercancel', 280));
    tap(300);
    expect(scene.playAction).not.toHaveBeenCalled();
  });
});
