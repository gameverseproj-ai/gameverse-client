import { Injectable, computed, signal } from '@angular/core';
import { Game, GameScore } from '../models/game.model';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class GameStateService {
  readonly activeGame = signal<Game | null>(null);
  readonly currentUser = signal<User | null>(null);
  readonly scores = signal<GameScore[]>([]);

  readonly isPlaying = computed(() => this.activeGame() !== null);
  readonly highScore = computed(() =>
    this.scores().reduce((max, s) => Math.max(max, s.score), 0)
  );
}
