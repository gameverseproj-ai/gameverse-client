import { Component, afterNextRender, inject } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CollectionsFacade } from '../../core/facades/collections.facade';
import { CollectionCardComponent } from './components/collection-card/collection-card.component';

/**
 * The album: one collection open at a time, its cards in a grid. Hidden cards
 * are face-down and blurred; revealed ones flip over to their fun facts.
 */
@Component({
  selector: 'app-collections',
  standalone: true,
  imports: [TranslatePipe, CollectionCardComponent],
  templateUrl: './collections.component.html',
  styleUrl: './collections.component.scss',
})
export class CollectionsComponent {
  readonly facade = inject(CollectionsFacade);

  constructor() {
    afterNextRender(() => this.facade.loadCollections());
  }

  summaryOf(collectionId: string) {
    return this.facade.collections().find((collection) => collection.id === collectionId);
  }
}
