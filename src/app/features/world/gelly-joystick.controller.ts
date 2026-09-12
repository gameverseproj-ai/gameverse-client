export interface JoystickState {
  visible: boolean;
  originX: number;
  originY: number;
  x: number;
  y: number;
}

/** One captured pointer owns the joystick until release or cancellation. */
export class GellyJoystickController {
  private fixedOrigin = false;
  private pointerId: number | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private state: JoystickState = { visible: false, originX: 0, originY: 0, x: 0, y: 0 };

  constructor(
    private readonly onChange: (state: JoystickState) => void,
    private readonly onMovement: (x: number, z: number) => void,
    private readonly holdMs = 300,
    private readonly radius = 44,
    private readonly travel = 72,
  ) {}

  start(pointerId: number, x: number, y: number, fixedOrigin = false): boolean {
    if (this.pointerId !== null) return false;
    this.pointerId = pointerId;
    this.fixedOrigin = fixedOrigin;
    this.state = { visible: false, originX: x, originY: y, x: 0, y: 0 };
    if (fixedOrigin) { this.state.visible = true; this.publish(); return true; }
    this.timer = setTimeout(() => {
      this.timer = null;
      this.state.visible = true;
      this.publish();
    }, this.holdMs);
    return true;
  }

  move(pointerId: number, x: number, y: number): void {
    if (pointerId !== this.pointerId) return;
    const dx = x - this.state.originX;
    const dy = y - this.state.originY;
    // A deliberate drag starts immediately; stationary holds still reveal the stick.
    if (!this.state.visible && Math.hypot(dx, dy) >= 3) {
      if (this.timer !== null) clearTimeout(this.timer);
      this.timer = null;
      this.state.visible = true;
    }
    // Follow an overextended pointer so reversing never requires retracing
    // hundreds of pixels outside the usable control range.
    const distance = Math.hypot(dx, dy);
    if (!this.fixedOrigin && distance > this.travel) {
      this.state.originX = x - dx / distance * this.travel;
      this.state.originY = y - dy / distance * this.travel;
    }
    // Physical travel is wider than the drawn stick, for precise cursor control.
    const scale = this.radius / Math.max(this.travel, Math.hypot(dx, dy));
    this.state.x = dx * scale;
    this.state.y = dy * scale;
    if (this.state.visible) this.publish();
  }

  end(pointerId: number): void {
    if (pointerId === this.pointerId) this.reset();
  }

  reset(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.pointerId = null;
    this.state = { ...this.state, visible: false, x: 0, y: 0 };
    this.publish();
  }

  private publish(): void {
    this.onChange({ ...this.state });
    this.onMovement(this.state.visible ? this.state.x / this.radius : 0,
      this.state.visible ? this.state.y / this.radius : 0);
  }
}
