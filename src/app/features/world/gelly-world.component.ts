import {
  Component,
  ElementRef,
  OnDestroy,
  NgZone,
  HostListener,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { GellyWorldScene } from './gelly-world.scene';
import { GamePortal } from '../../shared/world/game-portal.model';
import { GELLY_WORLD_THEME } from './gelly/gelly-world.theme';
import { GELLY_PORTALS } from './gelly/gelly-portals';
import { GellyHeroRenderer } from './gelly/gelly-hero.renderer';
import { GellyEnvironment } from './gelly/gelly-environment';

import { CameraMode } from './gelly-camera.controller';
import { GellyJoystickController } from './gelly-joystick.controller';
import { GameFacade } from '../../core/facades/game.facade';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-gelly-world',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './gelly-world.component.html',
  styleUrl: './gelly-world.component.scss',
})
export class GellyWorldComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly games = inject(GameFacade);
  private bootstrapRequest?: Subscription;
  private animationFinished = false;
  private dataReady = false;
  private navigating = false;
  readonly entryError = signal(false);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly containerRef = viewChild.required<ElementRef<HTMLDivElement>>('worldContainer');

  readonly mobileControls = signal(false);
  private movementPointer: number | null = null;
  private cameraPointer: { id: number; x: number; y: number } | null = null;
  private inputQuery?: MediaQueryList;
  private readonly inputModeChanged = () => {
    this.resetJoystick();
    this.mobileControls.set(this.inputQuery?.matches ?? false);
  };
  readonly cameraMode = signal<CameraMode>('third-person');
  setCameraMode(mode: CameraMode): void { this.cameraMode.set(mode); this.scene?.setCameraMode(mode); }

  readonly nearbyPortal = signal<GamePortal | null>(null);
  readonly enteringPortal = signal<GamePortal | null>(null);
  readonly joystickVisible = signal(false);
  readonly joystickOriginX = signal(0);
  readonly joystickOriginY = signal(0);
  readonly joystickX = signal(0);
  readonly joystickY = signal(0);

  private scene: GellyWorldScene | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private disposed = false;
  private readonly joystick = new GellyJoystickController(
    state => {
      this.joystickVisible.set(state.visible);
      this.joystickOriginX.set(state.originX);
      this.joystickOriginY.set(state.originY);
      this.joystickX.set(state.x);
      this.joystickY.set(state.y);
    },
    (x, z) => this.scene?.input.setJoystick(x, z),
  );

  constructor() {
    afterNextRender(() => {
      this.inputQuery = window.matchMedia('(pointer: coarse)');
      this.inputModeChanged();
      this.inputQuery.addEventListener('change', this.inputModeChanged);
      this.zone.runOutsideAngular(() => requestAnimationFrame(() => this.initScene()));
    });
  }

  private initScene(): void {
    if (this.disposed) return;
    const canvas = this.canvasRef().nativeElement;
    const container = this.containerRef().nativeElement;

    this.scene = new GellyWorldScene(
      canvas,
      container,
      (portal) => this.zone.run(() => this.nearbyPortal.set(portal)),
      () => this.zone.run(() => {
        this.animationFinished = true;
        this.finishEntry();
      }),
      GELLY_WORLD_THEME,
      GELLY_PORTALS,
      new GellyHeroRenderer(),
      new GellyEnvironment(GELLY_PORTALS),
      portal => this.zone.run(() => {
        this.enteringPortal.set(portal);
        this.resetJoystick();
        this.animationFinished = false;
        this.loadEntryData();
      }),
    );

    this.resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      this.resetJoystick();
      this.joystickOriginX.set(88);
      this.joystickOriginY.set(height - 170);
      this.scene?.resize(width, height);
    });
    this.resizeObserver.observe(container);
  }

  // ─── Floating joystick ───────────────────────────────────────────────────────

  loadEntryData(): void {
    const portal = this.enteringPortal();
    if (!portal || this.navigating) return;
    this.bootstrapRequest?.unsubscribe();
    this.entryError.set(false);
    this.dataReady = false;
    this.bootstrapRequest = this.games.loadBootstrap(portal.id).subscribe({
      next: () => { this.dataReady = true; this.finishEntry(); },
      error: () => this.entryError.set(true),
    });
  }

  private finishEntry(): void {
    const portal = this.enteringPortal();
    if (this.disposed || !portal || !this.animationFinished || !this.dataReady || this.navigating) return;
    this.navigating = true;
    this.router.navigate([portal.route]).then(success => {
      if (!success && !this.disposed) { this.navigating = false; this.entryError.set(true); }
    }).catch(() => {
      if (!this.disposed) { this.navigating = false; this.entryError.set(true); }
    });
  }

  cancelEntry(): void {
    if (this.navigating) return;
    this.bootstrapRequest?.unsubscribe();
    this.resetJoystick();
    this.resizeObserver?.disconnect();
    this.scene?.destroy();
    this.scene = null;
    this.enteringPortal.set(null);
    this.nearbyPortal.set(null);
    this.entryError.set(false);
    this.animationFinished = this.dataReady = false;
    this.cameraMode.set('third-person');
    this.zone.runOutsideAngular(() => this.initScene());
  }

  onPointerDown(event: PointerEvent): void {
    if (this.enteringPortal() || event.pointerType !== 'touch') return;
    if ((event.target as Element).closest('button, a, input, select, textarea')) return;
    this.mobileControls.set(true);
    const surface = event.currentTarget as HTMLElement;
    const bounds = surface.getBoundingClientRect();
    const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
    const centerX = 88, centerY = bounds.height - 170;
    if (Math.hypot(x - centerX, y - centerY) <= 72) {
      if (this.movementPointer !== null) return;
      if (!this.joystick.start(event.pointerId, centerX, centerY, true)) return;
      this.movementPointer = event.pointerId;
      this.joystick.move(event.pointerId, x, y);
    } else {
      if (this.cameraPointer) return;
      this.cameraPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    }
    event.preventDefault();
    surface.setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (event.pointerId === this.movementPointer) {
      const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
      this.joystick.move(event.pointerId, event.clientX - bounds.left, event.clientY - bounds.top);
    } else if (event.pointerId === this.cameraPointer?.id) {
      this.scene?.orbitCamera(event.clientX - this.cameraPointer.x, event.clientY - this.cameraPointer.y);
      this.cameraPointer.x = event.clientX; this.cameraPointer.y = event.clientY;
    }
  }

  onPointerEnd(event: PointerEvent): void {
    if (event.pointerId === this.movementPointer) { this.joystick.end(event.pointerId); this.movementPointer = null; }
    if (event.pointerId === this.cameraPointer?.id) this.cameraPointer = null;
    const surface = event.currentTarget as HTMLElement;
    if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
  }

  @HostListener('window:blur')
  resetJoystick(): void { this.joystick.reset(); this.movementPointer = null; this.cameraPointer = null; }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (document.hidden) this.resetJoystick();
  }

  playAction(action: 'jump' | 'wave'): void { this.scene?.playAction(action); }
  enterPortal(): void { this.scene?.interact(); }

  ngOnDestroy(): void {
    this.disposed = true;
    this.inputQuery?.removeEventListener('change', this.inputModeChanged);
    this.bootstrapRequest?.unsubscribe();
    this.resetJoystick();
    this.resizeObserver?.disconnect();
    this.scene?.destroy();
    this.scene = null;
  }
}
