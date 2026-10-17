import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { PlayerFacade } from '../../../core/facades/player.facade';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-username-editor', standalone: true, imports: [TranslatePipe],
  templateUrl: './username-editor.component.html', styleUrl: './username-editor.component.scss',
})
export class UsernameEditorComponent {
  readonly auth = inject(AuthService);
  private readonly player = inject(PlayerFacade);
  private readonly destroyRef = inject(DestroyRef);
  readonly draft = signal('');
  readonly saving = signal(false);
  readonly error = signal('');
  readonly saved = signal(false);
  /** A free variant the server offered when the chosen name was taken. */
  readonly suggestion = signal('');
  readonly valid = computed(() => !!this.draft().trim() && this.draft().trim().length <= 100);
  readonly changed = computed(() => this.draft().trim() !== this.auth.session()?.profile.username);

  constructor() {
    effect(() => { this.draft.set(this.auth.session()?.profile.username ?? ''); });
  }
  edit(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
    this.error.set(''); this.saved.set(false); this.suggestion.set('');
  }
  /** Takes the server's suggestion into the field and saves it. */
  useSuggestion(event: Event): void {
    const name = this.suggestion();
    if (!name) return;
    this.draft.set(name);
    this.suggestion.set('');
    this.save(event);
  }
  save(event: Event): void {
    event.preventDefault();
    if (this.saving() || this.auth.busy() || !this.auth.session() || !this.changed()) return;
    if (!this.valid()) { this.error.set('Enter a username between 1 and 100 characters.'); return; }
    this.saving.set(true); this.error.set(''); this.saved.set(false); this.suggestion.set('');
    this.auth.updateUsername(this.draft().trim()).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)),
    ).subscribe({
      next: session => {
        this.draft.set(session.profile.username);
        this.player.profile.update(profile => profile?.id === session.playerId
          ? { ...profile, username: session.profile.username } : profile);
        this.saved.set(true);
      },
      error: err => {
        if (err?.status === 409) {
          // ApiError from the interceptor, or the raw response body when there is none.
          const offered = err.suggestion ?? err.error?.suggestion;
          this.suggestion.set(typeof offered === 'string' ? offered : '');
          this.error.set('This username is already taken. Choose another.');
        } else this.error.set('Could not update username. Please try again.');
      },
    });
  }
}
