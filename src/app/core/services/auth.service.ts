import { Injectable, inject, signal } from '@angular/core';
import { finalize, switchMap, of, take, timeout } from 'rxjs';
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
  init(): void {
    if (this.busy() || this.session()) return;
    const telegram = !!(window as Window & { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData || new URLSearchParams(window.location.hash.slice(1)).has('tgWebAppData');
    this.mode.set(clientMode(telegram, Math.min(screen.width, screen.height), navigator.maxTouchPoints > 0));
    try { this.dismissed.set(localStorage.getItem('gameverse.auth.prompt-dismissed.v1') === 'true'); } catch { /* Playing remains available without storage. */ }
    this.busy.set(true); this.error.set('');
    this.api.me().pipe(switchMap(session => session ? of(session) : this.api.anonymous(this.locale.language())), take(1), timeout(10000), finalize(() => this.busy.set(false))).subscribe({ next: session => this.session.set(session), error: () => this.error.set('Sign-in is unavailable. You can keep playing.') });
  }
  dismiss(): void {
    this.dismissed.set(true);
    try { localStorage.setItem('gameverse.auth.prompt-dismissed.v1','true'); } catch { /* Optional preference. */ }
  }
  demo(provider: 'google' | 'telegram'): void {
    if (this.busy() || !this.session()) return;
    const credential: ProviderCredential = provider === 'google' ? {kind:'google',body:{idToken:'mock:success'}} : this.mode() === 'telegram' ? {kind:'telegram',body:{initData:'mock:success'}} : {kind:'telegram/web',body:{id:1,hash:'mock:success'}};
    this.busy.set(true); this.error.set('');
    this.api.attach(credential).pipe(take(1),timeout(10000),finalize(() => this.busy.set(false))).subscribe({ next: session => this.session.set(session), error: err => this.error.set(err?.code === 'IDENTITY_ALREADY_LINKED' ? 'This account belongs to another player. Your current progress is unchanged.' : 'Sign-in is unavailable. You can keep playing.') });
  }
}
