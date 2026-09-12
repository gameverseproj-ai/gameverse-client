import { Component, afterNextRender, inject, signal } from '@angular/core';
import { GameListComponent } from './components/game-list/game-list.component';
import { GameFacade } from '../../core/facades/game.facade';

@Component({
  selector: 'app-games',
  standalone: true,
  imports: [GameListComponent],
  templateUrl: './games.component.html',
  styleUrl: './games.component.scss',
})
export class GamesComponent {
  readonly gameFacade = inject(GameFacade);
  readonly filter     = signal('');

  constructor() {
    // Load Gelly World games on init; worldId becomes a route param once multi-world navigation lands
    afterNextRender(() => this.gameFacade.loadGames('gelly'));
  }
}
