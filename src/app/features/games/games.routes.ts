import { Routes } from '@angular/router';

export const GAMES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./games.component').then((m) => m.GamesComponent),
  },
  {
    path: ':id/play',
    loadComponent: () =>
      import('./components/game-canvas/game-canvas.component').then(
        (m) => m.GameCanvasComponent
      ),
  },
  {
    // Matches /games/snake, /games/tetris, /games/2048
    path: ':name',
    loadComponent: () =>
      import('./game-placeholder.component').then((m) => m.GamePlaceholderComponent),
  },
];
