import { LanguageService } from './core/i18n/language.service';
import { AccountControlsComponent } from './shared/components/account-controls/account-controls.component';
import { MusicService } from './core/audio/music.service';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { NavComponent } from './shared/components/nav/nav.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavComponent, AccountControlsComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly locale = inject(LanguageService);
  private readonly music = inject(MusicService);
  private readonly router = inject(Router);
  private readonly currentUrl = signal(this.router.url);

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(event => this.currentUrl.set(event.urlAfterRedirects));
    afterNextRender(() => {
      // Hydration may finish initial navigation before this component subscribes.
      this.currentUrl.set(this.router.url);
      this.locale.init();
      this.music.init();
    });
  }

  readonly isWorld = computed(() => /^\/world(?:s)?(?:\/|$)/.test(this.currentUrl().split(/[?#]/)[0]));
  readonly showNav = computed(() => !this.isWorld() && !/^\/games\/(snake|2048|tetris|power)(?:\/|$)/.test(this.currentUrl().split(/[?#]/)[0]));
}
