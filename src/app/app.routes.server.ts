import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'worlds/:id', renderMode: RenderMode.Server },
  { path: 'games/:name', renderMode: RenderMode.Server },
  { path: 'games/:id/play', renderMode: RenderMode.Server },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
