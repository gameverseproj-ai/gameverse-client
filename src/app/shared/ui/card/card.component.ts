import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true, imports: [TranslatePipe],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
})
export class CardComponent {
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly imageUrl = input<string>('');
}
