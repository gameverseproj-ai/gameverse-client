import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { CurrencyApi } from '../currency.api';
import {
  CurrencyBalances,
  SpendRequest,
  SpendResult,
  RewardRequest,
  RewardResult,
} from '../../models/currency.model';

@Injectable()
export class MockCurrencyApi implements CurrencyApi {
  private readonly ms = isPlatformBrowser(inject(PLATFORM_ID)) ? 250 : 0;

  private balances: CurrencyBalances = { coins: 350, gems: 12, xp: 2450 };

  getBalances(): Observable<CurrencyBalances> {
    return of({ ...this.balances }).pipe(delay(this.ms));
  }

  spend(request: SpendRequest): Observable<SpendResult> {
    const current = this.balances[request.currency];
    if (current < request.amount) {
      return of({ success: false, newBalance: current }).pipe(delay(this.ms));
    }
    this.balances = { ...this.balances, [request.currency]: current - request.amount };
    return of({ success: true, newBalance: this.balances[request.currency] }).pipe(delay(this.ms));
  }

  reward(request: RewardRequest): Observable<RewardResult> {
    this.balances = {
      coins: this.balances.coins + (request.coins ?? 0),
      gems:  this.balances.gems  + (request.gems  ?? 0),
      xp:    this.balances.xp    + (request.xp    ?? 0),
    };
    return of({ newBalances: { ...this.balances } }).pipe(delay(this.ms));
  }
}
