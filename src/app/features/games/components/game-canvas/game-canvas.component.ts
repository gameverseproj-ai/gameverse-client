import {
  Component,
  ElementRef,
  OnDestroy,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { GameEngineType } from '../../../../core/models/game.model';

@Component({
  selector: 'app-game-canvas',
  standalone: true,
  templateUrl: './game-canvas.component.html',
  styleUrl: './game-canvas.component.scss',
})
export class GameCanvasComponent implements OnDestroy {
  readonly id = input<string>();
  readonly engineType = input<GameEngineType>('snake');

  readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  readonly running = signal(false);
  readonly score = signal(0);

  togglePlay(): void {
    this.running.update((r) => !r);
  }

  ngOnDestroy(): void {
    this.running.set(false);
  }
}
