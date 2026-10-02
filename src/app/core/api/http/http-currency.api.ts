import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CurrencyApi } from '../currency.api';
import {
  CurrencyBalances, RewardRequest, RewardResult, SpendRequest, SpendResult,
} from '../../models/currency.model';
import { API_BASE_URL } from './api-config';

@Injectable({ providedIn: 'root' })
export class HttpCurrencyApi implements CurrencyApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  getBalances(): Observable<CurrencyBalances> {
    return this.http.get<CurrencyBalances>(`${this.base}/api/currency/balances`);
  }

  /** Insufficient funds comes back as a normal result, not an error. */
  spend(request: SpendRequest): Observable<SpendResult> {
    return this.http.post<SpendResult>(`${this.base}/api/currency/spend`, request);
  }

  reward(request: RewardRequest): Observable<RewardResult> {
    return this.http.post<RewardResult>(`${this.base}/api/currency/reward`, request);
  }
}
