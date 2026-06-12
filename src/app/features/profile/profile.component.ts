import { Component, inject } from '@angular/core';
import { GameStateService } from '../../core/services/game-state.service';
import { StatsComponent } from './components/stats/stats.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [StatsComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  readonly gameState = inject(GameStateService);
}
