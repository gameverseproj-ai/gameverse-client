import { Component, afterNextRender, inject } from '@angular/core';
import { PlayerFacade } from '../../core/facades/player.facade';
import { StatsComponent } from './components/stats/stats.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [StatsComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  readonly playerFacade = inject(PlayerFacade);

  constructor() {
    afterNextRender(() => this.playerFacade.loadAll());
  }
}
