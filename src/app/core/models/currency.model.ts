export interface CurrencyBalances {
  coins: number;
  gems: number;
  xp: number;
}

export interface SpendRequest {
  currency: 'coins' | 'gems';
  amount: number;
  reason: string;
}

export interface SpendResult {
  success: boolean;
  newBalance: number;
}

export interface RewardRequest {
  coins?: number;
  gems?: number;
  xp?: number;
  reason: string;
}

export interface RewardResult {
  newBalances: CurrencyBalances;
}
