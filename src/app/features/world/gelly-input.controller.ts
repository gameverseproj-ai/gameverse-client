export class GellyInputController {
  private readonly keys = new Set<string>();
  private joystickX = 0;
  private joystickZ = 0;

  private readonly onKeyDown: (e: KeyboardEvent) => void;
  private readonly onKeyUp: (e: KeyboardEvent) => void;

  constructor(private readonly onInteract: () => void) {
    this.onKeyDown = (e) => {
      this.keys.add(e.code);
      if (e.code === 'KeyE') this.onInteract();
    };
    this.onKeyUp = (e) => this.keys.delete(e.code);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  getMovement(): { x: number; z: number } {
    let x = this.joystickX;
    let z = this.joystickZ;

    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;

    const len = Math.sqrt(x * x + z * z);
    if (len > 1) { x /= len; z /= len; }

    return { x, z };
  }

  setJoystick(x: number, z: number): void {
    this.joystickX = x;
    this.joystickZ = z;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
