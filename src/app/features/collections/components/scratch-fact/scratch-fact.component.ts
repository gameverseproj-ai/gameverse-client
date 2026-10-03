import { Component, ElementRef, afterNextRender, inject, input, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { CollectionsFacade } from '../../../../core/facades/collections.facade';
import { CollectionFact } from '../../../../core/models/collection.model';

/**
 * One fun fact behind a scratch-off foil, like a lottery ticket. Rubbing the
 * foil with a finger or the mouse erases it; once about half is gone the fact
 * is bought with coins and the text appears under the remaining flakes. An
 * empty wallet restores the foil, so nothing is lost by trying.
 */
@Component({
  selector: 'app-scratch-fact',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './scratch-fact.component.html',
  styleUrl: './scratch-fact.component.scss',
})
export class ScratchFactComponent {
  readonly fact = input.required<CollectionFact>();
  readonly cardPosition = input.required<number>();
  readonly price = input.required<number>();

  private readonly facade = inject(CollectionsFacade);
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('foil');

  /** foil → buying → done; poor resets to foil after showing the message. */
  readonly phase = signal<'foil' | 'buying' | 'done' | 'poor'>('foil');
  private scratching = false;
  private strokes = 0;

  constructor() {
    afterNextRender(() => this.paintFoil());
  }

  pointerDown(event: PointerEvent): void {
    if (this.phase() !== 'foil') return;
    this.scratching = true;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.erase(event);
  }

  pointerMove(event: PointerEvent): void {
    if (this.scratching) this.erase(event);
  }

  pointerEnd(): void {
    this.scratching = false;
  }

  private erase(event: PointerEvent): void {
    const canvas = this.canvasRef()?.nativeElement;
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return;
    event.preventDefault();
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * (canvas.width / bounds.width);
    const y = (event.clientY - bounds.top) * (canvas.height / bounds.height);
    context.globalCompositeOperation = 'destination-out';
    // The scratch stroke must be fully opaque, or it only thins the foil.
    context.fillStyle = '#000';
    context.beginPath();
    context.arc(x, y, 14, 0, Math.PI * 2);
    context.fill();
    // Measuring every stroke would thrash getImageData; every sixth is enough.
    if (++this.strokes % 6 === 0 && this.erasedFraction(context, canvas) >= .45) this.buy();
  }

  private erasedFraction(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement): number {
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let clear = 0, total = 0;
    for (let i = 3; i < data.length; i += 32) { total++; if (data[i] < 40) clear++; }
    return total === 0 ? 0 : clear / total;
  }

  private buy(): void {
    if (this.phase() !== 'foil') return;
    this.phase.set('buying');
    this.scratching = false;
    this.facade.revealFact(this.cardPosition(), this.fact().position).subscribe({
      next: (result) => {
        if (result.success) { this.phase.set('done'); return; }
        this.phase.set('poor');
        this.paintFoil();
      },
      error: () => { this.phase.set('foil'); this.paintFoil(); },
    });
  }

  /** The silver layer with a hint of sparkle, repainted on refusal too. */
  private paintFoil(): void {
    const canvas = this.canvasRef()?.nativeElement;
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return;
    context.globalCompositeOperation = 'source-over';
    const shine = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    shine.addColorStop(0, '#9a7f3e');
    shine.addColorStop(.45, '#e8d391');
    shine.addColorStop(.55, '#c7ab5e');
    shine.addColorStop(1, '#8a6c2e');
    context.fillStyle = shine;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#fff7df55';
    context.font = '12px sans-serif';
    for (let i = 0; i < 14; i++) {
      context.fillText('✦', (i * 53 + 11) % canvas.width, (i * 29 + 18) % canvas.height);
    }
  }
}
