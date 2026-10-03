import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, catchError, finalize, of, shareReplay, tap } from 'rxjs';
import { AuthResponse } from '../../models/auth.model';
import { Language } from '../../models/language.model';
import { API_BASE_URL } from './api-config';
import { DeviceIdStore } from './device-id.store';
import { SessionStore } from './session.store';

/**
 * Guarantees a session exists before the rest of the API is used.
 *
 * <p>Screens ask for their data as soon as they load, which can happen before
 * sign-in has finished. The mocks needed no session, the server does, so the
 * first such call starts an anonymous one and everything waiting rides on it.
 * The request is single-flight: however many calls arrive at once, exactly one
 * account is created.
 */
@Injectable({ providedIn: 'root' })
export class SessionGate {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private readonly store = inject(SessionStore);
  private readonly device = inject(DeviceIdStore);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private inFlight: Observable<AuthResponse | null> | null = null;

  ensure(language?: Language): Observable<AuthResponse | null> {
    const existing = this.store.read();
    if (existing) return of(existing);
    // Rendering on the server has nowhere to keep a session, and must not mint
    // an account for every page render; the browser signs in after hydration.
    if (!this.browser) return of(null);
    if (this.inFlight) return this.inFlight;

    // The device ID brings a returning guest back to their account when the
    // stored session is gone; the server only honors it for anonymous users.
    const headers: Record<string, string> = {};
    if (language) headers['Accept-Language'] = language;
    const deviceId = this.device.get();
    if (deviceId) headers['x-device-id'] = deviceId;

    this.inFlight = this.http
      .post<AuthResponse>(`${this.base}/api/auth/anonymous`, null, { headers })
      .pipe(
        tap(session => this.store.save(session)),
        catchError(() => of(null)),
        finalize(() => { this.inFlight = null; }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.inFlight;
  }
}
