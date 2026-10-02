import { InjectionToken } from '@angular/core';

/**
 * Origin of the be-core server, without a trailing slash. Paths already carry
 * their own `/api` prefix, matching `authEndpoint` in the auth model.
 *
 * Override it in `app.config.ts` per environment:
 * `{ provide: API_BASE_URL, useValue: 'https://api.example.com' }`
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => 'http://localhost:8080',
});
