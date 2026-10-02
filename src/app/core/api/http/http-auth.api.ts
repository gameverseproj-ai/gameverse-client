import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, switchMap, throwError, tap } from 'rxjs';
import { AuthApi } from '../auth.api';
import { AuthResponse, ProviderCredential, authEndpoint } from '../../models/auth.model';
import { Language } from '../../models/language.model';
import { API_BASE_URL } from './api-config';
import { SessionStore } from './session.store';
import { SessionGate } from './session.gate';

/**
 * Sign-in against be-core. The session returned by each call is stored here, so
 * `me()` can answer from a saved token exactly as the mock answers from its own
 * storage.
 */
@Injectable({ providedIn: 'root' })
export class HttpAuthApi implements AuthApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private readonly session = inject(SessionStore);
  private readonly gate = inject(SessionGate);

  /**
   * The chosen language travels as Accept-Language, which the server reads.
   * Returns the session already in hand when there is one, exactly as the mock
   * does, so a screen that triggered sign-in first does not cause a second
   * account to be opened here.
   */
  anonymous(language: Language): Observable<AuthResponse> {
    return this.gate.ensure(language).pipe(
      switchMap(session => session
        ? of(session)
        : throwError(() => new Error('Sign-in is unavailable.'))),
    );
  }

  /** Null when nothing is stored, or when the stored session is no longer valid. */
  me(): Observable<AuthResponse | null> {
    if (!this.session.token()) return of(null);
    return this.http.get<AuthResponse>(`${this.base}/api/auth/me`).pipe(
      tap(session => this.session.save(session)),
      map(session => session as AuthResponse | null),
      catchError(() => {
        this.session.clear();
        return of(null);
      }),
    );
  }

  /** Converts the account already in the session; the server keeps its progress. */
  attach(credential: ProviderCredential): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}${authEndpoint(credential, true)}`, credential.body)
      .pipe(tap(session => this.session.save(session)));
  }
}
