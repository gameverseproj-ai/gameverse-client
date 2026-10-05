import { Component, ElementRef, HostListener, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { GoogleSignInService } from '../../../core/services/google-signin.service';
import { TelegramSignInService } from '../../../core/services/telegram-signin.service';
import { LanguageControlsComponent } from '../language-controls/language-controls.component';
import { MusicControlsComponent } from '../music-controls/music-controls.component';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LanguageService } from '../../../core/i18n/language.service';

@Component({
  selector: 'app-account-controls', standalone: true, imports: [TranslatePipe, LanguageControlsComponent, MusicControlsComponent], host: { '[class.world-mode]': 'worldMode()' },
  templateUrl: './account-controls.component.html', styleUrl: './account-controls.component.scss',
})
export class AccountControlsComponent {
  readonly worldMode = input(false);
  readonly auth = inject(AuthService);
  private readonly google = inject(GoogleSignInService);
  private readonly telegram = inject(TelegramSignInService);
  private readonly language = inject(LanguageService);
  readonly expanded = signal(false);
  readonly open = computed(() => this.expanded() || (!this.worldMode() && !!this.auth.session()?.anonymous && !this.auth.dismissed()));
  private readonly toggleButton = viewChild<ElementRef<HTMLButtonElement>>('accountToggle');
  // The Google host exists only while the panel is open; the effect fills it
  // the moment it enters the DOM and again whenever the language changes, so
  // Google's button (and its account chooser) follow the player's language.
  private readonly googleHost = viewChild<ElementRef<HTMLElement>>('googleHost');
  constructor() {
    effect(() => {
      const host = this.googleHost()?.nativeElement;
      const locale = this.language.language();
      if (host) this.google.renderButton(host, locale, idToken => this.auth.attachGoogle(idToken));
    });
  }
  close(): void { this.expanded.set(false); this.auth.dismiss(); this.toggleButton()?.nativeElement.focus(); }
  @HostListener('document:keydown.escape') escape(): void { if (this.open()) this.close(); }

  /** Mini App sessions carry signed initData; everywhere else the popup flow runs. */
  telegramLogin(): void {
    if (this.auth.mode() === 'telegram') { this.auth.attachTelegram(); return; }
    this.telegram.auth(
      user => this.auth.attachTelegramWidget(user),
      () => this.auth.error.set('Sign-in is unavailable. You can keep playing.'),
    );
  }
}
