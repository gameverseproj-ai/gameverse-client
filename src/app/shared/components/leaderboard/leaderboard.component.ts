import { Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { Subscription, timeout } from 'rxjs';
import { HttpLeaderboardApi } from '../../../core/api/http/http-leaderboard.api';
import { Leaderboard, LeaderboardPrize } from '../../../core/models/leaderboard.model';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-leaderboard', standalone: true, imports: [TranslatePipe],
  templateUrl: './leaderboard.component.html', styleUrl: './leaderboard.component.scss',
})
export class LeaderboardComponent {
  readonly gameId = input.required<string>();
  readonly board = signal<Leaderboard | null>(null);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly page = signal(0);
  readonly pageSize = signal(5);
  readonly pages = computed(() => Math.max(1, Math.ceil((this.board()?.standings.length ?? 0) / this.pageSize())));
  readonly rows = computed(() => this.board()?.standings.slice(this.page() * this.pageSize(), (this.page() + 1) * this.pageSize()) ?? []);
  readonly locale = inject(LanguageService);
  private readonly api = inject(HttpLeaderboardApi);
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');
  private readonly mounted = signal(false);
  private request?: Subscription;
  private observer?: ResizeObserver;

  constructor() {
    afterNextRender(() => this.mounted.set(true));
    effect(() => { const id = this.gameId(); if (this.mounted()) this.load(id); });
    effect(onCleanup => {
      const element = this.list()?.nativeElement;
      if (!this.mounted() || !element) return;
      this.observer = new ResizeObserver(([entry]) => {
        const size = Math.max(1, Math.min(10, Math.floor(entry.contentRect.height / 52)));
        if (size !== this.pageSize()) { this.pageSize.set(size); this.page.set(0); }
      });
      this.observer.observe(element);
      onCleanup(() => this.observer?.disconnect());
    });
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
  }
  reload(): void { this.load(this.gameId()); }
  private load(id: string): void {
    this.request?.unsubscribe();
    this.board.set(null); this.page.set(0); this.failed.set(false); this.loading.set(true);
    this.request = this.api.get(id).pipe(timeout(10000)).subscribe({
      next: board => { this.board.set(board); this.loading.set(false); },
      error: () => { this.failed.set(true); this.loading.set(false); },
    });
  }
  move(delta: number): void { this.page.update(page => Math.max(0, Math.min(this.pages() - 1, page + delta))); }
  number(value: number): string { return new Intl.NumberFormat(this.locale.language()).format(value); }
  endDate(value: string): string {
    return new Intl.DateTimeFormat(this.locale.language(), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  }
  reward(prize: LeaderboardPrize | null): string {
    if (!prize) return '—';
    return [prize.coins ? `${this.number(prize.coins)} ${this.locale.t('Coins')}` : '',
      prize.gems ? `${this.number(prize.gems)} ${this.locale.t('Gems')}` : '',
      prize.xp ? `${this.number(prize.xp)} XP` : ''].filter(Boolean).join(' · ') || '—';
  }
}
