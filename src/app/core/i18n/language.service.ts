import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take, timeout } from 'rxjs';
import { PLAYER_API } from '../api/player.api';
import { Language, validLanguage } from '../models/language.model';
import { translate } from './translate';
@Injectable({providedIn: 'root'})
export class LanguageService {
  private readonly api = inject(PLAYER_API);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  readonly language = signal<Language>('en');
  readonly busy = signal(false);
  readonly error = signal('');
  private initialized = false;
  t(value: unknown, params?: readonly unknown[]): string { return translate(value,this.language(),params); }
  init(): void { if (!this.initialized) { this.initialized = true; this.load(); } }
  load(): void {
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    this.api.getLanguagePreference().pipe(timeout(10000),take(1),takeUntilDestroyed(this.destroyRef)).subscribe({
      next: p => this.apply(p.language),
      error: () => {this.busy.set(false);this.error.set('Could not load language settings.');},
    });
  }
  select(language: string): void {
    if (!validLanguage(language) || this.busy()) return;
    this.busy.set(true); this.error.set('');
    this.api.saveLanguagePreference({language}).pipe(timeout(10000),take(1),takeUntilDestroyed(this.destroyRef)).subscribe({
      next: p => this.apply(p.language),
      error: () => {this.busy.set(false);this.error.set('Language was not saved. Please try again.');},
    });
  }
  private apply(language: Language): void {
    if (!validLanguage(language)) {this.busy.set(false);this.error.set('Could not load language settings.');return;}
    this.language.set(language); this.busy.set(false);
    this.document.documentElement.lang = language;
    this.document.documentElement.dir = language === 'he' || language === 'ar' ? 'rtl' : 'ltr';
  }
}
