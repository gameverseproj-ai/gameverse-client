import { Component, afterNextRender, effect, inject, signal, untracked } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CollectionsFacade } from '../../core/facades/collections.facade';
import { CollectionCardComponent } from './components/collection-card/collection-card.component';
import { CollectionSummary } from '../../core/models/collection.model';

/**
 * The shelf: every collection as a collapsible album, one open at a time, its
 * cards in a grid. Hidden cards are face-down and blurred; revealed ones flip
 * over to their fun facts. Progress is collection points earned from play.
 */
@Component({
  selector: 'app-collections',
  standalone: true,
  imports: [TranslatePipe, RouterLink, CollectionCardComponent],
  templateUrl: './collections.component.html',
  styleUrl: './collections.component.scss',
})
export class CollectionsComponent {
  readonly facade = inject(CollectionsFacade);

  private readonly language = inject(LanguageService);
  private readonly mounted = signal(false);

  constructor() {
    afterNextRender(() => this.mounted.set(true));
    // Collection content is localized by the server using the saved account language.
    effect(() => {
      this.language.language();
      if (this.mounted()) untracked(() => this.facade.loadCollections());
    });
  }

  /** A collapsed album keeps its summary; the open one is the facade's detail. */
  readonly collapsed = signal(false);

  isOpen(collectionId: string): boolean {
    return !this.collapsed() && this.facade.detail()?.id === collectionId;
  }

  toggle(collectionId: string): void {
    if (this.isOpen(collectionId)) {
      this.collapsed.set(true);
      return;
    }
    this.collapsed.set(false);
    if (this.facade.detail()?.id !== collectionId) this.facade.loadDetail(collectionId);
  }

  percentOf(collection: CollectionSummary): number {
    if (!collection.pointsPerCard || collection.nextCardIn === null) return 0;
    const into = collection.pointsPerCard - collection.nextCardIn;
    return Math.max(0, Math.min(100, Math.round((into / collection.pointsPerCard) * 100)));
  }

  capOf(): number {
    return this.facade.collections()[0]?.hourlyCapPerGame ?? 30;
  }

  summaryOf(collectionId: string) {
    return this.facade.collections().find((collection) => collection.id === collectionId);
  }
}
