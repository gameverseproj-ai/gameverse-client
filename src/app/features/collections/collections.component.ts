import { Component, afterNextRender, effect, inject, signal, untracked } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { RouterLink } from '@angular/router';
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

  summaryOf(collectionId: string) {
    return this.facade.collections().find((collection) => collection.id === collectionId);
  }
}
