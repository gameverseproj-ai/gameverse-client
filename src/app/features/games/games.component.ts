import { Component, signal } from '@angular/core';
import { GameListComponent } from './components/game-list/game-list.component';
import { Game } from '../../core/models/game.model';

@Component({
  selector: 'app-games',
  standalone: true,
  imports: [GameListComponent],
  templateUrl: './games.component.html',
  styleUrl: './games.component.scss',
})
export class GamesComponent {
  readonly games = signal<Game[]>([]);
  readonly loading = signal(false);
  readonly filter = signal('');
}
