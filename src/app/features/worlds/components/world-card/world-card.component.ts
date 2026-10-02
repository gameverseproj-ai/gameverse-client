import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { World } from '../../../../core/models/world.model';

@Component({
  selector: 'app-world-card',
  standalone: true,
  imports: [TranslatePipe, RouterLink],
  templateUrl: './world-card.component.html',
  styleUrl: './world-card.component.scss',
})
export class WorldCardComponent {
  readonly world = input.required<World>();
}
