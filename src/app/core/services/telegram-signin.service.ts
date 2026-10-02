import { Injectable, InjectionToken, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Numeric id of @gameverse_play_bot (public — any Telegram client can see it).
 * The Login Widget domain bound in BotFather is {@code 127.0.0.1}, so open the
 * app at {@code http://127.0.0.1:4200} to test Telegram sign-in locally.
 */
export const TELEGRAM_BOT_ID = new InjectionToken<number>('TELEGRAM_BOT_ID', {
  providedIn: 'root',
  factory: () => 8921000009,
});

export type TelegramWidgetUser = { id: number; hash: string; auth_date?: number; first_name?: string; last_name?: string; username?: string; photo_url?: string };

type TelegramLogin = { auth(options: { bot_id: number; request_access?: string; lang?: string }, callback: (user: TelegramWidgetUser | false) => void): void };

/**
 * Telegram sign-in through the official popup flow ({@code Telegram.Login.auth}).
 * The embedded iframe button is skipped on purpose: Telegram serves it with
 * {@code frame-ancestors} stripped of the port, which blocks any dev origin
 * like {@code 127.0.0.1:4200}. The popup validates the same bound domain but
 * accepts ported origins, and hands back the same signed user object.
 */
@Injectable({ providedIn: 'root' })
export class TelegramSignInService {
  private readonly botId = inject(TELEGRAM_BOT_ID);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private script?: Promise<TelegramLogin>;

  /** Opens Telegram's auth popup; {@code callback} gets the signed user, or nothing on cancel. */
  auth(callback: (user: TelegramWidgetUser) => void, onUnavailable: () => void): void {
    if (!this.browser) return;
    this.load().then(login => login.auth(
      { bot_id: this.botId, request_access: 'write' },
      user => { if (user) callback(user); },
    )).catch(onUnavailable);
  }

  private load(): Promise<TelegramLogin> {
    this.script ??= new Promise<TelegramLogin>((resolve, reject) => {
      const ready = () => {
        const login = (window as Window & { Telegram?: { Login?: TelegramLogin } }).Telegram?.Login;
        login ? resolve(login) : reject(new Error('Telegram widget library did not load.'));
      };
      const existing = document.querySelector<HTMLScriptElement>('script[src^="https://telegram.org/js/telegram-widget.js"]');
      if (existing) { existing.addEventListener('load', ready); if ((window as never as { Telegram?: unknown }).Telegram) ready(); return; }
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.async = true;
      script.onload = ready;
      script.onerror = () => reject(new Error('Telegram widget library failed to load.'));
      document.head.appendChild(script);
    });
    return this.script;
  }
}
