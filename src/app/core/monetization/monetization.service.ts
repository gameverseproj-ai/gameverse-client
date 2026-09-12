import { Injectable } from '@angular/core';

export const MONETIZATION_POINTS = {
  TETRIS_RUN_LOST: 'tetris.run_lost',
  SNAKE_RUN_LOST: 'snake.run_lost',
} as const;
export type MonetizationContext = { point: typeof MONETIZATION_POINTS[keyof typeof MONETIZATION_POINTS]; gameId: 'snake' | 'tetris'; runId: string; segment: string; level: number };

@Injectable({providedIn:'root'})
export class MonetizationService {
  /** MONETIZATION_POINT: snake.run_lost — extension hook only; no ads, rewards or extra lives. */
  reach(_context: MonetizationContext): void {
    // Future integration belongs here. Gameplay must not depend on its availability.
  }
}
