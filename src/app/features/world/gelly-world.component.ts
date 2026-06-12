import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { GellyWorldScene } from './gelly-world.scene';
import { GamePortal } from '../../shared/world/game-portal.model';
import { GELLY_WORLD_THEME } from './gelly/gelly-world.theme';
import { GELLY_PORTALS } from './gelly/gelly-portals';
import { GellyHeroRenderer } from './gelly/gelly-hero.renderer';

const JOYSTICK_MAX_RADIUS = 40;

@Component({
  selector: 'app-gelly-world',
  standalone: true,
  templateUrl: './gelly-world.component.html',
  styleUrl: './gelly-world.component.scss',
})
export class GellyWorldComponent implements OnDestroy {
  private readonly router = inject(Router);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly containerRef = viewChild.required<ElementRef<HTMLDivElement>>('worldContainer');

  readonly nearbyPortal = signal<GamePortal | null>(null);
  readonly joystickX = signal(0);
  readonly joystickY = signal(0);

  private scene: GellyWorldScene | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private touchStartX = 0;
  private touchStartY = 0;

  constructor() {
    // afterNextRender fires after Angular's DOM update, but browser layout may not
    // be complete yet. The inner rAF defers until the first paint so clientWidth/
    // clientHeight (and window.innerWidth/Height) are fully resolved.
    afterNextRender(() => {
      requestAnimationFrame(() => this.initScene());
    });
  }

  private initScene(): void {
    const canvas = this.canvasRef().nativeElement;
    const container = this.containerRef().nativeElement;

    this.scene = new GellyWorldScene(
      canvas,
      container,
      (portal) => this.nearbyPortal.set(portal),
      (portal) => this.router.navigate([portal.route]),
      GELLY_WORLD_THEME,
      GELLY_PORTALS,
      new GellyHeroRenderer(),
    );

    this.resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      this.scene?.resize(width, height);
    });
    this.resizeObserver.observe(container);
  }

  // ─── Mobile joystick ─────────────────────────────────────────────────────────

  onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    const t = event.changedTouches[0];
    this.touchStartX = t.clientX;
    this.touchStartY = t.clientY;
  }

  onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    const t = event.changedTouches[0];
    const dx = t.clientX - this.touchStartX;
    const dy = t.clientY - this.touchStartY;
    const len = Math.sqrt(dx * dx + dy * dy);

    const cx = len > JOYSTICK_MAX_RADIUS ? (dx / len) * JOYSTICK_MAX_RADIUS : dx;
    const cy = len > JOYSTICK_MAX_RADIUS ? (dy / len) * JOYSTICK_MAX_RADIUS : dy;

    this.joystickX.set(cx);
    this.joystickY.set(cy);
    this.scene?.input.setJoystick(cx / JOYSTICK_MAX_RADIUS, cy / JOYSTICK_MAX_RADIUS);
  }

  onTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    this.joystickX.set(0);
    this.joystickY.set(0);
    this.scene?.input.setJoystick(0, 0);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.scene?.destroy();
    this.scene = null;
  }
}
