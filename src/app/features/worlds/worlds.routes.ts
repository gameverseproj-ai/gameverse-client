import { Routes } from '@angular/router';

export const WORLDS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./worlds.component').then((m) => m.WorldsComponent),
  },
  { path: 'neon-city', data: { world: 'neon' }, loadComponent: () => import('../world/gelly-world.component').then(m => m.GellyWorldComponent) },
  { path: 'gelly', redirectTo: '/world', pathMatch: 'full' },
  {
    path: ':id',
    loadComponent: () =>
      import('./components/world-detail/world-detail.component').then(
        (m) => m.WorldDetailComponent
      ),
  },
];
