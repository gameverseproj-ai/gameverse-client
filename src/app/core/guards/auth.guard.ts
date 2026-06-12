import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GameStateService } from '../services/game-state.service';

export const authGuard: CanActivateFn = () => {
  const gameState = inject(GameStateService);
  const router = inject(Router);

  if (gameState.currentUser()) return true;
  return router.createUrlTree(['/home']);
};
