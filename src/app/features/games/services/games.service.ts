import { Injectable, signal } from '@angular/core';
import { Game } from '../../../core/models/game.model';

@Injectable({ providedIn: 'root' })
export class GamesService {
  readonly games = signal<Game[]>([]);
}
