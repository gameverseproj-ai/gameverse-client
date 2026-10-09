import { RenderMode, ServerRoute } from '@angular/ssr';

// Vercel serves this build as static files, so every route a visitor can open
// directly must be prerendered — a Server-rendered route has no file and 404s
// at the edge. The game and world screens load their data in the browser after
// hydration, so a prerendered shell per known id is all they need.
const GAME_IDS = ['power', 'tetris', '2048', 'snake', 'tennis'];
const WORLD_IDS = ['gelly', 'neon-city', 'pixel-realm'];

export const serverRoutes: ServerRoute[] = [
  {
    path: 'worlds/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => WORLD_IDS.map(id => ({ id })),
  },
  {
    path: 'games/:id/play',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => GAME_IDS.map(id => ({ id })),
  },
  {
    path: 'games/:name',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => GAME_IDS.map(name => ({ name })),
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
