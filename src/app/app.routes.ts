import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'worlds', pathMatch: 'full' },
  {
    path: 'world',
    loadChildren: () =>
      import('./features/world/world.routes').then((m) => m.WORLD_ROUTES),
  },
  { path: 'home', redirectTo: 'worlds', pathMatch: 'full' },
  {
    path: 'worlds',
    loadChildren: () =>
      import('./features/worlds/worlds.routes').then((m) => m.WORLDS_ROUTES),
  },
  {
    path: 'games',
    loadChildren: () =>
      import('./features/games/games.routes').then((m) => m.GAMES_ROUTES),
  },
  {
    path: 'profile',
    loadChildren: () =>
      import('./features/profile/profile.routes').then((m) => m.PROFILE_ROUTES),
  },
  { path: '**', redirectTo: 'worlds' },
];
