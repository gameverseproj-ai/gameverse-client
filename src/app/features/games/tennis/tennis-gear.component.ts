import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { RACKETS, RacketId, TennisProfile } from './tennis.api';

@Component({
  selector: 'app-tennis-gear',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './tennis-gear.component.html',
  styleUrl: './tennis-gear.component.scss',
})
export class TennisGearComponent {
  readonly profile = input<TennisProfile | null>(null);
  readonly mock = input(false);
  readonly busy = input(false);
  readonly equip = output<RacketId>();
  readonly rackets = RACKETS;
}
