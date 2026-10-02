import { Injectable, InjectionToken, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Google OAuth client ID the Identity Services button signs tokens for. The
 * server only accepts ID tokens minted for this same audience, so override the
 * two together (`GOOGLE_CLIENT_ID` env on be-core).
 */
export const GOOGLE_CLIENT_ID = new InjectionToken<string>('GOOGLE_CLIENT_ID', {
  providedIn: 'root',
  factory: () => '741688211312-j23j6eu652e0sv4ka30tkbo2gi42hu94.apps.googleusercontent.com',
});

type GoogleId = {
  initialize(config: { client_id: string; callback: (response: { credential: string }) => void }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
};

/**
 * Loads Google Identity Services once and renders its official sign-in button.
 * The button is Google's own iframe: it opens the account chooser and hands
 * back a real ID token, which is the only credential be-core accepts.
 */
@Injectable({ providedIn: 'root' })
export class GoogleSignInService {
  private readonly clientId = inject(GOOGLE_CLIENT_ID);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private script?: Promise<GoogleId>;
  private onCredential: (idToken: string) => void = () => {};

  /** Renders the button into {@code host}; {@code callback} receives the ID token. */
  renderButton(host: HTMLElement, callback: (idToken: string) => void): void {
    if (!this.browser) return;
    this.onCredential = callback;
    this.load().then(id => {
      host.replaceChildren();
      id.renderButton(host, { type: 'standard', theme: 'outline', size: 'large', text: 'signin_with', width: 250 });
    }).catch(() => { /* The dialog's own error line reports sign-in trouble. */ });
  }

  private load(): Promise<GoogleId> {
    this.script ??= new Promise<GoogleId>((resolve, reject) => {
      const ready = () => {
        const id = (window as Window & { google?: { accounts?: { id?: GoogleId } } }).google?.accounts?.id;
        if (!id) { reject(new Error('Google Identity Services did not load.')); return; }
        // One initialize for the service lifetime; the callback indirection
        // lets each render pass its own handler.
        id.initialize({ client_id: this.clientId, callback: response => this.onCredential(response.credential) });
        resolve(id);
      };
      const existing = document.querySelector<HTMLScriptElement>('script[src^="https://accounts.google.com/gsi/client"]');
      if (existing) { existing.addEventListener('load', ready); if ((window as never as { google?: unknown }).google) ready(); return; }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = ready;
      script.onerror = () => reject(new Error('Google Identity Services failed to load.'));
      document.head.appendChild(script);
    });
    return this.script;
  }
}
