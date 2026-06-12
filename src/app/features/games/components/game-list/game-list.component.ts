import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { Game } from '../../../../core/models/game.model';

@Component({
  selector: 'app-game-list',
  standalone: true,
  imports: [RouterLink, CardComponent],
  templateUrl: './game-list.component.html',
  styleUrl: './game-list.component.scss',
})
export class GameListComponent {
  readonly games = input<Game[]>([]);
  readonly filter = input('');

  readonly filteredGames = computed(() => {
    const term = this.filter().toLowerCase().trim();
    if (!term) return this.games();
    return this.games().filter((g) => g.title.toLowerCase().includes(term));
  });
}
