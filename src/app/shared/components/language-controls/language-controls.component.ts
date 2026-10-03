import { Component, ElementRef, HostListener, computed, inject, input, signal } from '@angular/core';
import { LanguageService } from '../../../core/i18n/language.service';
import { LANGUAGES, Language } from '../../../core/models/language.model';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-language-controls', standalone: true, imports: [TranslatePipe],
  templateUrl: './language-controls.component.html',
  styleUrl: './language-controls.component.scss',
  host: { '[class.compact]': 'compact()', '(keydown.escape)': 'escape($event)' },
})
export class LanguageControlsComponent {
  readonly locale = inject(LanguageService);
  readonly languages = LANGUAGES;
  readonly compact = input(false);
  readonly expanded = signal(false);
  readonly current = computed(() => this.languages.find(language => language.code === this.locale.language())!);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  select(language: Language): void {
    if (!this.locale.busy() && language !== this.locale.language()) this.locale.select(language);
  }

  escape(event: Event): void {
    if (!this.expanded()) return;
    event.stopPropagation();
    this.expanded.set(false);
    this.host.nativeElement.querySelector<HTMLButtonElement>('.language-trigger')?.focus();
  }

  @HostListener('document:pointerdown', ['$event'])
  outside(event: PointerEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.expanded.set(false);
  }

  @HostListener('focusout', ['$event'])
  blur(event: FocusEvent): void {
    if (event.relatedTarget && !this.host.nativeElement.contains(event.relatedTarget as Node)) this.expanded.set(false);
  }
}
