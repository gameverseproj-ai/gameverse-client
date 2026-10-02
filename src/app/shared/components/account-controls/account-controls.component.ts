import { Component, ElementRef, HostListener, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { GoogleSignInService } from '../../../core/services/google-signin.service';
import { TelegramSignInService } from '../../../core/services/telegram-signin.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-account-controls', standalone: true, imports: [TranslatePipe],
  templateUrl: './account-controls.component.html', styleUrl: './account-controls.component.scss',
})
export class AccountControlsComponent {
  readonly auth = inject(AuthService);
  private readonly google = inject(GoogleSignInService);
  private readonly telegram = inject(TelegramSignInService);
  readonly expanded = signal(false);
  readonly open = computed(() => this.expanded() || (!!this.auth.session()?.anonymous && !this.auth.dismissed()));
  private readonly toggleButton = viewChild<ElementRef<HTMLButtonElement>>('accountToggle');
  // The Google host exists only while the panel is open; the effect fills it
  // the moment it enters the DOM.
  private readonly googleHost = viewChild<ElementRef<HTMLElement>>('googleHost');
  constructor() {
    afterNextRender(() => this.auth.init());
    effect(() => {
      const host = this.googleHost()?.nativeElement;
      if (host && !host.childElementCount) this.google.renderButton(host, idToken => this.auth.attachGoogle(idToken));
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
