import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { Component, afterNextRender, inject, input } from '@angular/core';
import { WorldFacade } from '../../../../core/facades/world.facade';

@Component({
  selector: 'app-world-detail',
  standalone: true, imports: [TranslatePipe],
  templateUrl: './world-detail.component.html',
  styleUrl: './world-detail.component.scss',
})
export class WorldDetailComponent {
  readonly id          = input<string>();
  readonly worldFacade = inject(WorldFacade);

  constructor() {
    afterNextRender(() => {
      const id = this.id();
      if (id) this.worldFacade.loadWorldById(id);
    });
  }
}
