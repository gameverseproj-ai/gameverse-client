import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthResponse } from '../../models/auth.model';

const KEY = 'gameverse.auth.session.v1';

/**
 * Keeps the signed session between page loads, the same job the mock adapter
 * does with its own key. Only the HTTP API layer touches this.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private memory: AuthResponse | null = null;

  read(): AuthResponse | null {
    if (this.memory) return this.memory;
    if (!this.browser) return null;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const value = JSON.parse(raw) as AuthResponse;
      // A mock session must never be presented to a real server.
      if (!value?.token || value.token.startsWith('mock:')) { this.clear(); return null; }
      this.memory = value;
      return value;
    } catch { return null; }
  }

  save(session: AuthResponse): AuthResponse {
    this.memory = session;
    if (this.browser) {
      try { localStorage.setItem(KEY, JSON.stringify(session)); } catch { /* Playing continues without storage. */ }
    }
    return session;
  }

  clear(): void {
    this.memory = null;
    if (this.browser) {
      try { localStorage.removeItem(KEY); } catch { /* Nothing to clean up. */ }
    }
  }

  token(): string | null {
    return this.read()?.token ?? null;
  }
}
