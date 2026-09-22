import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { defer, of } from 'rxjs';
import { AuthApi } from '../auth.api';
import { AuthResponse, ProviderCredential } from '../../models/auth.model';
import { Language, validLanguage } from '../../models/language.model';

const KEY = 'gameverse.auth.mock.v1';
export class MockAuthError extends Error {
  constructor(readonly code: 'IDENTITY_ALREADY_LINKED' | 'UNAUTHORIZED' | 'INVALID_SESSION') { super(code); }
}
/** One local player, matching the existing game mocks. Conversion never moves game saves. */
@Injectable({ providedIn: 'root' })
export class MockAuthApi implements AuthApi {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private memory: AuthResponse | null = null;
  private read(): AuthResponse | null {
    const raw = this.browser ? localStorage.getItem(KEY) : null;
    const value = raw ? JSON.parse(raw) as AuthResponse : this.memory;
    if (value && (value.playerId !== 'player-001' || !value.userId || !value.token?.startsWith('mock:') || typeof value.anonymous !== 'boolean' || !validLanguage(value.language) || !value.profile?.username || !Array.isArray(value.identities) || value.identities.some(p => !['GOOGLE','TELEGRAM','DEV'].includes(p)) || value.anonymous !== (value.identities.length === 0))) throw new MockAuthError('INVALID_SESSION');
    return value ? structuredClone(value) : null;
  }
  private save(value: AuthResponse): AuthResponse {
    if (this.browser) localStorage.setItem(KEY, JSON.stringify(value));
    this.memory = structuredClone(value);
    return structuredClone(value);
  }
  me() { return defer(() => of(this.read())); }
  anonymous(language: Language) {
    return defer(() => {
      const existing = this.read();
      if (existing) return of(existing);
      return of(this.save({ token: `mock:${crypto.randomUUID()}`, userId: crypto.randomUUID(), playerId: 'player-001', anonymous: true, language,
        profile: { username: 'GellyExplorer', firstName: null, lastName: null, email: null, avatarUrl: null, language }, identities: [] }));
    });
  }
  attach(credential: ProviderCredential) {
    return defer(() => {
      const state = this.read();
      if (!state) throw new MockAuthError('UNAUTHORIZED');
      // Deliberately accept only test fixtures: no real credentials or provider SDKs yet.
      const proof = credential.kind === 'google' ? credential.body.idToken : credential.kind === 'telegram' ? credential.body.initData : credential.body.hash;
      if (proof === 'mock:linked') throw new MockAuthError('IDENTITY_ALREADY_LINKED');
      if (proof !== 'mock:success') throw new MockAuthError('UNAUTHORIZED');
      const provider = credential.kind === 'google' ? 'GOOGLE' : 'TELEGRAM';
      return of(this.save({ ...state, anonymous: false, token: `mock:${crypto.randomUUID()}`, identities: [...new Set([...state.identities, provider] as AuthResponse['identities'])] }));
    });
  }
}
