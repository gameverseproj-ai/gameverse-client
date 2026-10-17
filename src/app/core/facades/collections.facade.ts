import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subscription, tap } from 'rxjs';
import { LanguageService } from '../i18n/language.service';
import { COLLECTION_API } from '../api/collection.api';
import { CURRENCY_API } from '../api/currency.api';
import { CollectionDetail, CollectionSummary, RevealFactResult } from '../models/collection.model';

@Injectable({ providedIn: 'root' })
export class CollectionsFacade {
  private readonly api = inject(COLLECTION_API);
  private readonly currency = inject(CURRENCY_API);
  private readonly language = inject(LanguageService);
  private listRequest?: Subscription;
  private detailRequest?: Subscription;

  readonly collections = signal<CollectionSummary[]>([]);
  readonly detail      = signal<CollectionDetail | null>(null);
  readonly coins       = signal<number | null>(null);
  readonly loading     = signal(false);
  readonly error       = signal('');

  loadCollections(): void {
    this.listRequest?.unsubscribe();
    this.detailRequest?.unsubscribe();
    const selected = this.detail()?.id;
    this.loading.set(true);
    this.error.set('');
    this.currency.getBalances().subscribe({
      next:  (balances) => this.coins.set(balances.coins),
      error: () => { /* The album still works; the price tags carry the cost. */ },
    });
    this.listRequest = this.api.getCollections().subscribe({
      next:  (collections) => {
        this.collections.set(collections);
        this.loading.set(false);
        // One album is open at a time; the active collection is the default.
        const active = collections.find(c => c.id === selected) ?? collections.find((c) => c.state === 'active') ?? collections[0];
        if (active) this.loadDetail(active.id);
      },
      error: () => { this.loading.set(false); this.error.set('Could not load collections.'); },
    });
  }

  loadDetail(collectionId: string): void {
    this.detailRequest?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.detailRequest = this.api.getCollection(collectionId).subscribe({
      next:  (detail) => { this.detail.set(detail); this.loading.set(false); },
      error: () => { this.loading.set(false); this.error.set('Could not load collections.'); },
    });
  }

  /**
   * Buys one fact. On success the open album is patched in place, so the text
   * appears under the half-scratched foil without a reload; an insufficient
   * wallet flows back to the caller as a normal result.
   */
  revealFact(cardPosition: number, factPosition: number): Observable<RevealFactResult> {
    const detail = this.detail();
    const language = this.language.language();
    return this.api.revealFact(detail!.id, cardPosition, factPosition).pipe(
      tap((result) => {
        this.coins.set(result.coins);
        if (!result.success || !result.text || this.detail()?.id !== detail!.id) return;
        if (this.language.language() !== language) {
          this.loadDetail(detail!.id);
          return;
        }
        this.detail.update((current) => current && ({
          ...current,
          cards: current.cards.map((card) => card.position !== cardPosition ? card : ({
            ...card,
            facts: (card.facts ?? []).map((fact) => fact.position !== factPosition
              ? fact
              : { ...fact, revealed: true, text: result.text }),
          })),
        }));
      }),
    );
  }
}
