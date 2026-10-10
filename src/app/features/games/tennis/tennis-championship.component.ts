import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import {
  TennisChampionship,
  TennisStandings,
  TennisTrophy,
  TennisBracketMatch,
} from './tennis.api';

@Component({
  selector: 'app-tennis-championship',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './tennis-championship.component.html',
  styleUrl: './tennis-championship.component.scss',
})
export class TennisChampionshipComponent {
  readonly championship = input<TennisChampionship | null>(null);
  readonly standings = input<TennisStandings | null>(null);
  readonly trophies = input<TennisTrophy[]>([]);
  readonly me = input<string | null>(null);
  readonly busy = input(false);
  readonly register = output<void>();
  readonly refresh = output<void>();
  readonly playBracket = output<TennisBracketMatch>();
  /** The bracket match waiting for the local player, if any. */
  myBracketMatch(): TennisBracketMatch | null {
    const me = this.me();
    const rounds = this.standings()?.bracket.rounds ?? [];
    for (const round of rounds)
      for (const match of round.matches)
        if (
          match.status === 'pending' &&
          match.roomId &&
          (match.playerAId === me || match.playerBId === me)
        )
          return match;
    return null;
  }
  standingName(playerId: string | null): string {
    if (!playerId) return '—';
    const row = this.standings()?.standings.find(
      (s) => s.playerId === playerId,
    );
    return row?.username ?? '…';
  }
  when(iso: string | null | undefined): string {
    if (!iso) return '';
    return new Date(iso).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
