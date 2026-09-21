import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { World } from '../../../../core/models/world.model';

@Component({
  selector: 'app-world-card',
  standalone: true,
  imports: [TranslatePipe, RouterLink, CardComponent],
  templateUrl: './world-card.component.html',
  styleUrl: './world-card.component.scss',
})
export class WorldCardComponent {
  readonly world = input.required<World>();
}
