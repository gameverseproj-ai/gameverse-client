import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CurrencyBalances,
  SpendRequest,
  SpendResult,
  RewardRequest,
  RewardResult,
} from '../models/currency.model';

export interface CurrencyApi {
  getBalances(): Observable<CurrencyBalances>;
  spend(request: SpendRequest): Observable<SpendResult>;
  reward(request: RewardRequest): Observable<RewardResult>;
}

export const CURRENCY_API = new InjectionToken<CurrencyApi>('CURRENCY_API');
