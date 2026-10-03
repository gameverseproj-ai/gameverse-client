import { Routes } from '@angular/router';

export const COLLECTIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./collections.component').then((m) => m.CollectionsComponent),
  },
];
