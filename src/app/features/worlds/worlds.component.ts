import { WorldReturnService } from '../world/world-return.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Component, afterNextRender, inject } from '@angular/core';
import { WorldCardComponent } from './components/world-card/world-card.component';
import { WorldFacade } from '../../core/facades/world.facade';

@Component({
  selector: 'app-worlds',
  standalone: true,
  imports: [TranslatePipe, WorldCardComponent],
  templateUrl: './worlds.component.html',
  styleUrl: './worlds.component.scss',
})
export class WorldsComponent {
  private readonly returnPoint = inject(WorldReturnService);
  readonly worldFacade = inject(WorldFacade);

  constructor() {
    afterNextRender(() => { this.returnPoint.clear(); this.worldFacade.loadWorlds(); });
  }
}
