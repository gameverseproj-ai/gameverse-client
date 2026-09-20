import { MusicService } from './core/audio/music.service';
import { MusicControlsComponent } from './shared/components/music-controls/music-controls.component';
import { Component, afterNextRender, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { NavComponent } from './shared/components/nav/nav.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavComponent, MusicControlsComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly music = inject(MusicService);
  constructor() { afterNextRender(() => this.music.init()); }

  private readonly router = inject(Router);

  readonly showNav = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => !e.urlAfterRedirects.startsWith('/world') && !e.urlAfterRedirects.startsWith('/games/snake') && !e.urlAfterRedirects.startsWith('/games/2048') && !e.urlAfterRedirects.startsWith('/games/tetris')),
    ),
    // initialValue checks the URL already present before first navigation
    { initialValue: !this.router.url.startsWith('/world') && !this.router.url.startsWith('/games/snake') && !this.router.url.startsWith('/games/2048') && !this.router.url.startsWith('/games/tetris') },
  );
}
