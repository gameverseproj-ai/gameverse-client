import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { GameFacade } from '../../core/facades/game.facade';
import { RouterLink } from '@angular/router';

const GAME_META: Record<string, { label: string; icon: string; color: string }> = {
  power: { label: 'Power Gym', icon: '💪', color: '#ff743d' },
  snake:  { label: 'Snake Hall',      icon: '🐍', color: '#22c55e' },
  tetris: { label: 'Tetris Factory',  icon: '🧩', color: '#7c3aed' },
  '2048': { label: '2048 Temple',     icon: '🔢', color: '#f59e0b' },
};

@Component({
  selector: 'app-game-placeholder',
  standalone: true,
  imports: [TranslatePipe, RouterLink],
  templateUrl: './game-placeholder.component.html',
  styleUrl: './game-placeholder.component.scss',
})
export class GamePlaceholderComponent {
  private readonly games = inject(GameFacade);
  readonly loadError = signal(false);
  readonly name = input<string>('');
  readonly bootstrap = computed(() => {
    const data = this.games.bootstrap();
    return data?.gameId === this.name() ? data : null;
  });

  constructor() {
    effect(onCleanup => {
      const gameId = this.name();
      if (!gameId || untracked(() => this.games.bootstrap()?.gameId === gameId)) return;
      this.loadError.set(false);
      const request = this.games.loadBootstrap(gameId).subscribe({ error: () => this.loadError.set(true) });
      onCleanup(() => request.unsubscribe());
    });
  }

  readonly meta = computed(() => GAME_META[this.name()] ?? { label: this.name(), icon: '🎮', color: '#7c3aed' });
}
