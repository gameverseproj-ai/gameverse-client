import { InjectionToken } from '@angular/core';

/**
 * Origin of the be-core server, without a trailing slash. Paths already carry
 * their own `/api` prefix, matching `authEndpoint` in the auth model.
 *
 * Local browser requests use the Angular dev proxy to be-core on port 8080. Anywhere
 * else the client calls the production be-core on Render, whose
 * GAMEVERSE_CORS_ORIGINS must list the client's domain.
 *
 * A different deployment overrides this in `app.config.ts`:
 * `{ provide: API_BASE_URL, useValue: 'https://api.example.com' }`
 * (an empty value means same-origin behind a reverse proxy, with no CORS).
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => {
    const local = typeof location === 'undefined'
      || ['localhost', '127.0.0.1'].includes(location.hostname);
    return local ? (typeof location === 'undefined' ? 'http://localhost:8080' : '') : 'https://gameverse-core.onrender.com';
  },
});
