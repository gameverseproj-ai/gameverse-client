import { Component, ElementRef, HostListener, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-account-controls', standalone: true, imports: [TranslatePipe],
  templateUrl: './account-controls.component.html', styleUrl: './account-controls.component.scss',
})
export class AccountControlsComponent {
  readonly auth = inject(AuthService);
  readonly expanded = signal(false);
  readonly open = computed(() => this.expanded() || (!!this.auth.session()?.anonymous && !this.auth.dismissed()));
  private readonly toggleButton = viewChild<ElementRef<HTMLButtonElement>>('accountToggle');
  constructor() { afterNextRender(() => this.auth.init()); }
  close(): void { this.expanded.set(false); this.auth.dismiss(); this.toggleButton()?.nativeElement.focus(); }
  @HostListener('document:keydown.escape') escape(): void { if (this.open()) this.close(); }
}
