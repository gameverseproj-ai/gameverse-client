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

  private touch: { id: number; x: number; y: number; started: number; moved: boolean } | null = null;
  private suppressClick = false;

  startTilt(event: PointerEvent): void {
    if (event.pointerType === 'mouse' || !event.isPrimary || this.touch) return;
    // Facts keep their own scratch and scroll gestures on the reverse side.
    if ((event.target as Element).closest('ol, button, a')) return;
    this.suppressClick = false;
    this.touch = { id: event.pointerId, x: event.clientX, y: event.clientY, started: event.timeStamp, moved: false };
    const el = event.currentTarget as HTMLElement;
    el.setPointerCapture(event.pointerId);
    el.classList.add('touch-tilting');
    this.tilt(event);
  }

  endTilt(event: PointerEvent): void {
    if (event.pointerId !== this.touch?.id) return;
    this.suppressClick = event.type !== 'pointerup' || this.touch.moved || event.timeStamp - this.touch.started > 180;
    this.touch = null;
    const el = event.currentTarget as HTMLElement;
    if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
    el.classList.remove('touch-tilting');
    this.resetTilt(event);
  }

  clickCard(event: MouseEvent): void {
    if (this.suppressClick && event.detail !== 0) { this.suppressClick = false; return; }
    this.suppressClick = false;
    this.flip();
  }

  tilt(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' && event.pointerId !== this.touch?.id) return;
    if (this.touch && Math.hypot(event.clientX - this.touch.x, event.clientY - this.touch.y) > 6) this.touch.moved = true;
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.setProperty('--rx', `${(0.5 - y) * 12}deg`);
      el.style.setProperty('--ry', `${(x - 0.5) * 14}deg`);
    }
    el.style.setProperty('--shine-x', `${x * 100}%`);
    el.style.setProperty('--shine-y', `${y * 100}%`);
  }

  resetTilt(event: PointerEvent): void {
    if (this.touch) return;
    const el = event.currentTarget as HTMLElement;
    ['--rx', '--ry', '--shine-x', '--shine-y'].forEach(key => el.style.removeProperty(key));
  }

  flip(): void {
    if (this.card().revealed) this.side.update((side) => side === 'back' ? 'front' : 'back');
  }
}
