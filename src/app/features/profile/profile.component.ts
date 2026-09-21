import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { MusicControlsComponent } from '../../shared/components/music-controls/music-controls.component';
import { Component, afterNextRender, inject } from '@angular/core';
import { PlayerFacade } from '../../core/facades/player.facade';
import { StatsComponent } from './components/stats/stats.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [TranslatePipe, StatsComponent, MusicControlsComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  readonly playerFacade = inject(PlayerFacade);

  constructor() {
    afterNextRender(() => this.playerFacade.loadAll());
  }
}
