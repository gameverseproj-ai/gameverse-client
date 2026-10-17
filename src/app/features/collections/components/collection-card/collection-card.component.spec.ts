import { TestBed } from '@angular/core/testing';
import { CollectionCardComponent } from './collection-card.component';

describe('Collection card touch inspection', () => {
  let card: CollectionCardComponent;
  let element: HTMLDivElement;
  function pointer(type: string, x: number, y: number, time: number): PointerEvent {
    const event = new PointerEvent(type, { pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y });
    Object.defineProperties(event, { currentTarget: { value: element }, target: { value: element, configurable: true }, timeStamp: { value: time } });
    return event;
  }
  beforeEach(() => {
    const fixture = TestBed.createComponent(CollectionCardComponent);
    fixture.componentRef.setInput('card', { revealed: true });
    card = fixture.componentInstance;
    element = document.createElement('div');
    spyOn(element, 'setPointerCapture');
    spyOn(element, 'hasPointerCapture').and.returnValue(false);
    spyOn(element, 'getBoundingClientRect').and.returnValue(new DOMRect(0, 0, 200, 300));
  });
  it('moves the shine with a held finger and does not flip after a drag', () => {
    card.startTilt(pointer('pointerdown', 40, 40, 0));
    card.tilt(pointer('pointermove', 160, 240, 100));
    expect(element.style.getPropertyValue('--shine-x')).toBe('80%');
    expect(element.style.getPropertyValue('--shine-y')).toBe('80%');
    expect(element.classList.contains('touch-tilting')).toBeTrue();
    card.endTilt(pointer('pointerup', 160, 240, 120));
    card.clickCard(new MouseEvent('click', { detail: 1 }));
    expect(card.side()).toBe('idle');
    expect(element.style.getPropertyValue('--shine-x')).toBe('');
    expect(element.classList.contains('touch-tilting')).toBeFalse();
  });
  it('still flips on a short tap but not on a stationary hold', () => {
    card.startTilt(pointer('pointerdown', 40, 40, 0));
    card.endTilt(pointer('pointerup', 40, 40, 80));
    card.clickCard(new MouseEvent('click', { detail: 1 }));
    expect(card.side()).toBe('back');
    card.startTilt(pointer('pointerdown', 40, 40, 200));
    card.endTilt(pointer('pointerup', 40, 40, 600));
    card.clickCard(new MouseEvent('click', { detail: 1 }));
    expect(card.side()).toBe('back');
  });
  it('cleans up a cancelled touch and allows the next tap', () => {
    card.startTilt(pointer('pointerdown', 40, 40, 0));
    card.endTilt(pointer('pointercancel', 40, 40, 80));
    expect(element.classList.contains('touch-tilting')).toBeFalse();
    card.startTilt(pointer('pointerdown', 40, 40, 200));
    card.endTilt(pointer('pointerup', 40, 40, 250));
    card.clickCard(new MouseEvent('click', { detail: 1 }));
    expect(card.side()).toBe('back');
  });
  it('leaves scratch facts in control of their pointer', () => {
    const facts = document.createElement('ol');
    element.append(facts);
    const event = pointer('pointerdown', 40, 40, 0);
    Object.defineProperty(event, 'target', { value: facts, configurable: true });
    card.startTilt(event);
    expect(element.setPointerCapture).not.toHaveBeenCalled();
  });
});
