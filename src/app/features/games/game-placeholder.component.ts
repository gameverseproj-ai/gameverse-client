import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

const GAME_META: Record<string, { label: string; icon: string; color: string }> = {
  snake:  { label: 'Snake Hall',      icon: '🐍', color: '#22c55e' },
  tetris: { label: 'Tetris Factory',  icon: '🧩', color: '#7c3aed' },
  '2048': { label: '2048 Temple',     icon: '🔢', color: '#f59e0b' },
};

@Component({
  selector: 'app-game-placeholder',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './game-placeholder.component.html',
  styleUrl: './game-placeholder.component.scss',
})
export class GamePlaceholderComponent {
  readonly name = input<string>('');

  readonly meta = computed(() => GAME_META[this.name()] ?? { label: this.name(), icon: '🎮', color: '#7c3aed' });
}
