import { HeroAction } from '../../shared/world/hero-renderer.interface';
export class GellyInputController {
  private readonly keys = new Set<string>();
  private joystickX = 0;
  private joystickZ = 0;

  private readonly onKeyDown: (e: KeyboardEvent) => void;
  private readonly onKeyUp: (e: KeyboardEvent) => void;

  private readonly onBlur = () => { this.keys.clear(); this.setJoystick(0, 0); };

  constructor(private readonly onInteract: () => void, private readonly onAction: (action: HeroAction) => void = () => {}) {
    this.onKeyDown = (e) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select, [contenteditable=true]')) return;
      if (e.code === 'Space' && (e.target as HTMLElement)?.closest('button')) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
      if (!e.repeat && e.code === 'Space') this.onAction('jump');
      if (!e.repeat && e.code === 'KeyQ') this.onAction('wave');
      if (!e.repeat && e.code === 'KeyE') this.onInteract();
    };
    this.onKeyUp = (e) => this.keys.delete(e.code);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  getMovement(): { x: number; z: number } {
    // Ignore tiny finger drift without delaying deliberate steering.
    const axis = (value: number, deadZone: number) =>
      Math.sign(value) * Math.max(0, (Math.min(1, Math.abs(value)) - deadZone) / (1 - deadZone));
    // Linear response keeps small corrections immediate and predictable.
    let x = axis(this.joystickX, .04);
    let z = axis(this.joystickZ, .04);

    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;

    // These are steering and throttle, not two spatial movement axes.
    x = Math.max(-1, Math.min(1, x));
    z = Math.max(-1, Math.min(1, z));

    const sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 1.6 : 1;
    return { x, z: z * sprint };
  }

  setJoystick(x: number, z: number): void {
    this.joystickX = x;
    this.joystickZ = z;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }
}
