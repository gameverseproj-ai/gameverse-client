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
  readonly worldFacade = inject(WorldFacade);

  constructor() {
    afterNextRender(() => this.worldFacade.loadWorlds());
  }
}
