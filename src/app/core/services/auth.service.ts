import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { catchError, finalize, switchMap, of, take, tap, timeout } from 'rxjs';
import { AUTH_API } from '../api/auth.api';
import { AuthResponse, ClientMode, ProviderCredential, clientMode } from '../models/auth.model';
import { LanguageService } from '../i18n/language.service';

@Injectable({providedIn: 'root'})
export class AuthService {
  private readonly api = inject(AUTH_API);
  private readonly locale = inject(LanguageService);
  readonly session = signal<AuthResponse | null>(null);
  readonly mode = signal<ClientMode>('desktop');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly dismissed = signal(false);
  private readonly platformId = inject(PLATFORM_ID);
  private initialization?: Promise<void>;

  /** Startup must finish restoring an account (or a guest) before navigation. */
  init(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return Promise.resolve();
    return this.initialization ??= new Promise<void>(resolve => this.restore(resolve));
  }

  private restore(done: () => void): void {
    const webApp = (window as Window & { Telegram?: { WebApp?: { initData?: string; ready?: () => void } } }).Telegram?.WebApp;
    webApp?.ready?.();
    const telegram = !!webApp?.initData || new URLSearchParams(window.location.hash.slice(1)).has('tgWebAppData');
    this.mode.set(clientMode(telegram, Math.min(screen.width, screen.height), navigator.maxTouchPoints > 0));
    try { this.dismissed.set(localStorage.getItem('gameverse.auth.prompt-dismissed.v1') === 'true'); } catch { /* Playing remains available without storage. */ }
    this.busy.set(true); this.error.set('');
    this.api.me().pipe(
      switchMap(session => session ? of(session) : this.api.anonymous(this.locale.language())),
      tap(session => this.session.set(session)),
      switchMap(session => {
        const initData = this.telegramInitData();
        if (!session?.anonymous || !initData) return of(session);
        // Finish the signed Mini App login before loading worlds and preferences.
        return this.api.attach({ kind: 'telegram', body: { initData } }).pipe(
          catchError(() => {
            this.error.set('Sign-in is unavailable. You can keep playing.');
            return of(session);
          }),
        );
      }),
      take(1),
      timeout(10000),
      finalize(() => { this.busy.set(false); done(); }),
    ).subscribe({
      next: session => this.session.set(session),
      error: () => this.error.set('Sign-in is unavailable. You can keep playing.'),
    });
  }

  dismiss(): void {
    this.dismissed.set(true);
    try { localStorage.setItem('gameverse.auth.prompt-dismissed.v1','true'); } catch { /* Optional preference. */ }
  }
  /** A real Google ID token from the Identity Services button. */
  attachGoogle(idToken: string): void { this.attach({ kind: 'google', body: { idToken } }); }

  /** The signed initData the Telegram SDK exposes inside a Mini App, or null elsewhere. */
  private telegramInitData(): string | null {
    const data = (window as Window & { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData;
    return data && data.length > 0 ? data : null;
  }

  /** Inside the Telegram Mini App the signed initData is already in hand. */
  attachTelegram(): void {
    const initData = this.telegramInitData();
    if (!initData) { this.error.set('Sign-in is unavailable. You can keep playing.'); return; }
    this.attach({ kind: 'telegram', body: { initData } });
  }

  /** The signed user object the Telegram Login Widget hands to its callback. */
  attachTelegramWidget(user: { id: number; hash: string; auth_date?: number; first_name?: string; last_name?: string; username?: string; photo_url?: string }): void {
    this.attach({ kind: 'telegram/web', body: user });
  }

  private attach(credential: ProviderCredential): void {
    if (this.busy() || !this.session()) return;
    this.busy.set(true); this.error.set('');
    this.api.attach(credential).pipe(take(1),timeout(10000),finalize(() => this.busy.set(false))).subscribe({ next: session => this.session.set(session), error: err => this.error.set(err?.code === 'IDENTITY_ALREADY_LINKED' ? 'This account belongs to another player. Your current progress is unchanged.' : 'Sign-in is unavailable. You can keep playing.') });
  }
}
