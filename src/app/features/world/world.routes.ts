import { Routes } from '@angular/router';

export const WORLD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./gelly-world.component').then((m) => m.GellyWorldComponent),
  },
];
