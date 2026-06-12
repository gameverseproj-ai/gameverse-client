import { Component, signal } from '@angular/core';
import { WorldCardComponent } from './components/world-card/world-card.component';
import { World } from '../../core/models/world.model';

@Component({
  selector: 'app-worlds',
  standalone: true,
  imports: [WorldCardComponent],
  templateUrl: './worlds.component.html',
  styleUrl: './worlds.component.scss',
})
export class WorldsComponent {
  readonly worlds = signal<World[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
}
