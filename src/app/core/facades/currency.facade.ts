import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CURRENCY_API } from '../api/currency.api';
import { CurrencyBalances, SpendRequest, SpendResult, RewardRequest, RewardResult } from '../models/currency.model';

@Injectable({ providedIn: 'root' })
export class CurrencyFacade {
  private readonly api = inject(CURRENCY_API);

  readonly balances = signal<CurrencyBalances | null>(null);
  readonly loading  = signal(false);

  loadBalances(): void {
    this.loading.set(true);
    this.api.getBalances().subscribe({
      next:  (b) => { this.balances.set(b); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
  }

  /** Returns the observable so callers can react to success/failure inline. */
  spend(request: SpendRequest): Observable<SpendResult> {
    return this.api.spend(request).pipe(
      tap(() => this.loadBalances()),
    );
  }

  /** Returns the observable so callers can display earned rewards. */
  reward(request: RewardRequest): Observable<RewardResult> {
    return this.api.reward(request).pipe(
      tap(() => this.loadBalances()),
    );
  }
}
