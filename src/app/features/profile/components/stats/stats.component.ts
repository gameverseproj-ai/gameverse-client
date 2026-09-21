import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-stats',
  standalone: true, imports: [TranslatePipe],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.scss',
})
export class StatsComponent {
  readonly highScore = input(0);
  readonly gamesPlayed = input(0);
  readonly totalScore = input(0);
}
