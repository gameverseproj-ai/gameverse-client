import { Component, computed, input, signal } from '@angular/core';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { CollectionCard } from '../../../../core/models/collection.model';
import { ScratchFactComponent } from '../scratch-fact/scratch-fact.component';

/**
 * One collector's card. Hidden cards lie face-down in velvet and gold; a
 * revealed card turns over in real 3D — lifting off the shelf at the midpoint
 * of the turn — between its portrait and the fun facts on its back. The whole
 * card is the control: tapping it turns it either way, no buttons.
 */
@Component({
  selector: 'app-collection-card',
  standalone: true,
  imports: [TranslatePipe, ScratchFactComponent],
  templateUrl: './collection-card.component.html',
  styleUrl: './collection-card.component.scss',
})
export class CollectionCardComponent {
  readonly card = input.required<CollectionCard>();
  readonly price = input.required<number>();
  readonly collectionId = input.required<string>();
  readonly collectionName = input.required<string>();

  /** idle until the first turn, so cards don't animate on page load. */
  readonly side = signal<'idle' | 'back' | 'front'>('idle');
  readonly artBroken = signal(false);

  readonly artSrc = computed(() => this.card().imageUrl
    || `assets/collections/${this.collectionId()}/${this.card().position}.jpg`);

  flip(): void {
    if (this.card().revealed) this.side.update((side) => side === 'back' ? 'front' : 'back');
  }
}
