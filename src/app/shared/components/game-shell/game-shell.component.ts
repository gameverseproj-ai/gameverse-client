import { LeaderboardComponent } from '../leaderboard/leaderboard.component';
import { Component, afterNextRender, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
export type GamePage = 'play' | 'progress' | 'help' | 'leaderboard';

@Component({
  selector: 'app-game-shell', standalone: true, imports: [RouterLink, TranslatePipe, LeaderboardComponent],
  templateUrl: './game-shell.component.html', styleUrl: './game-shell.component.scss',
})
export class GameShellComponent {
  readonly gameId = input.required<string>();
  readonly title = input.required<string>();
  readonly pageChange = output<GamePage>();
  readonly page = signal<GamePage>('play');
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  constructor() {
    afterNextRender(() => this.pageChange.emit(this.page()));
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const value = params.get('page');
      const page = value === 'progress' || value === 'help' || value === 'leaderboard' ? value : 'play';
      this.page.set(page);
      this.pageChange.emit(page);
    });
  }
  go(page: GamePage): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { page: page === 'play' ? null : page }, queryParamsHandling: 'merge' });
  }
}
