import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { Component, ElementRef, HostListener, Input, computed, inject, signal } from '@angular/core';
import { MusicService } from '../../../core/audio/music.service';
import { MusicGenre } from '../../../core/models/music.model';

@Component({
  selector: 'app-music-controls', standalone: true, imports: [TranslatePipe],
  templateUrl: './music-controls.component.html', styleUrl: './music-controls.component.scss',
  host: { '[class.compact]': 'compact', '(keydown.escape)': 'escape($event)' },
})
export class MusicControlsComponent {
  @Input() compact = false;
  readonly music = inject(MusicService);
  readonly genres: {id: MusicGenre | 'off'; name: string}[] = [
    {id: 'rock', name: 'Rock'}, {id: 'pop', name: 'Pop'},
    {id: 'funk', name: 'Funk'}, {id: 'trance', name: 'Trance'},
    {id: 'metal', name: 'Metal'}, {id: 'lounge', name: 'Lounge'}, {id: 'off', name: 'Music off'},
  ];
  readonly selected = computed(() => this.music.preferences().enabled ? this.music.preferences().genre : 'off');
  readonly current = computed(() => this.genres.find(genre => genre.id === this.selected())!);
  readonly busy = computed(() => this.music.loading());
  readonly expanded = signal(false);
  readonly active = signal(0);
  private static nextId = 0;
  readonly listId = `music-options-${MusicControlsComponent.nextId++}`;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  toggle(): void {
    if (this.busy()) return;
    this.active.set(this.genres.findIndex(genre => genre.id === this.selected()));
    this.expanded.update(open => !open);
  }
  select(genre: MusicGenre | 'off'): void {
    if (this.busy()) return;
    this.expanded.set(false);
    this.focusTrigger();
    if (genre === 'off') this.music.turnOff();
    else this.music.choose(genre);
  }
  keydown(event: KeyboardEvent): void {
    if (this.busy()) return;
    const key = event.key;
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
      event.preventDefault();
      if (!this.expanded()) { this.toggle(); return; }
      const count = this.genres.length;
      this.active.set(key === 'Home' ? 0 : key === 'End' ? count - 1 : (this.active() + (key === 'ArrowDown' ? 1 : -1) + count) % count);
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (this.expanded()) this.select(this.genres[this.active()].id);
      else this.toggle();
    }
  }
  escape(event: Event): void {
    if (!this.expanded()) return;
    event.stopPropagation(); this.expanded.set(false); this.focusTrigger();
  }
  private focusTrigger(): void { this.host.nativeElement.querySelector<HTMLButtonElement>('.music-trigger')?.focus(); }
  @HostListener('document:pointerdown', ['$event'])
  outside(event: PointerEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.expanded.set(false);
  }
  @HostListener('focusout', ['$event'])
  blur(event: FocusEvent): void {
    if (event.relatedTarget && !this.host.nativeElement.contains(event.relatedTarget as Node)) this.expanded.set(false);
  }
  changeVolume(event: Event): void { this.music.volume(Number((event.target as HTMLInputElement).value) / 100); }
}
