import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { GamePage, GameShellComponent } from './game-shell.component';

@Component({ standalone: true, imports: [GameShellComponent], template: `
  <app-game-shell gameId="snake" title="Snake Hall" (pageChange)="page = $event">
    <canvas gamePlay></canvas><div gameProgress>Progress</div><div gameHelp>Rules</div>
  </app-game-shell>` })
class TestGameComponent { page: GamePage = 'play'; }

describe('Game page navigation', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideRouter([{ path: 'games/snake', component: TestGameComponent }])],
  }));

  it('keeps the board alive and inert while another page is shown, and supports returning', async () => {
    const harness = await RouterTestingHarness.create();
    const host = await harness.navigateByUrl('/games/snake', TestGameComponent);
    const board = harness.routeNativeElement!.querySelector('canvas')!;
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/games/snake?page=progress');
    harness.detectChanges();
    expect(host.page).toBe('progress');
    expect(board.closest('[hidden]')).not.toBeNull();
    expect(board.closest('[inert]')).not.toBeNull();
    await router.navigateByUrl('/games/snake');
    harness.detectChanges();
    expect(host.page).toBe('play');
    expect(harness.routeNativeElement!.querySelector('canvas')).toBe(board);
    expect(board.closest('[hidden]')).toBeNull();
  });

  it('opens rules from a direct URL and recovers from an unknown page', async () => {
    const harness = await RouterTestingHarness.create('/games/snake?page=help');
    const root = harness.routeNativeElement!;
    expect(root.querySelector('[gameHelp]')!.closest('[hidden]')).toBeNull();
    expect(root.querySelector('[gamePlay]')!.closest('[hidden]')).not.toBeNull();
    await TestBed.inject(Router).navigateByUrl('/games/snake?page=unknown');
    harness.detectChanges();
    expect(root.querySelector('[gamePlay]')!.closest('[hidden]')).toBeNull();
    expect(root.querySelector('a.exit')!.getAttribute('href')).toBe('/world?from=snake');
  });
});
