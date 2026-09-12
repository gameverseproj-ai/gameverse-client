import { Routes } from '@angular/router';

export const GAMES_ROUTES: Routes = [
  { path: 'tetris/play', redirectTo: 'tetris', pathMatch: 'full' },
  { path: 'tetris', loadComponent: () => import('./tetris/tetris.component').then(m => m.TetrisComponent) },
  { path: '2048/play', redirectTo: '2048', pathMatch: 'full' },
  { path: '2048', loadComponent: () => import('./temple/temple.component').then(m => m.TempleComponent) },
  { path: 'snake/play', redirectTo: 'snake', pathMatch: 'full' },
  { path: 'snake', loadComponent: () => import('./snake/snake.component').then(m => m.SnakeComponent) },
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
