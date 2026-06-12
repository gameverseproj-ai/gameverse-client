import { Routes } from '@angular/router';

export const WORLDS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./worlds.component').then((m) => m.WorldsComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./components/world-detail/world-detail.component').then(
        (m) => m.WorldDetailComponent
      ),
  },
];
