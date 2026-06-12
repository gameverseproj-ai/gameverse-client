import { Component, input, signal } from '@angular/core';
import { World } from '../../../../core/models/world.model';

@Component({
  selector: 'app-world-detail',
  standalone: true,
  templateUrl: './world-detail.component.html',
  styleUrl: './world-detail.component.scss',
})
export class WorldDetailComponent {
  readonly id = input<string>();
  readonly world = signal<World | null>(null);
}
