/** Matches be-core collection DTOs. */
export type CollectionState = 'active' | 'locked' | 'completed';

export interface CollectionSummary {
  id: string;
  name: string;
  coverImageUrl: string;
  totalCards: number;
  revealedCards: number;
  progress: number;
  nextCardIn: number | null;
  state: CollectionState;
}

export interface CollectionFact {
  position: number;
  revealed: boolean;
  text: string | null;
}

export interface CollectionCard {
  position: number;
  revealed: boolean;
  /** Hidden cards carry nothing but their position. */
  name: string | null;
  imageUrl: string | null;
  facts: CollectionFact[] | null;
}

export interface CollectionDetail {
  id: string;
  name: string;
  description: string;
  factPriceCoins: number;
  progress: number;
  nextCardIn: number | null;
  cards: CollectionCard[];
}

/** Insufficient funds is a normal result: success false, text null. */
export interface RevealFactResult {
  success: boolean;
  coins: number;
  text: string | null;
}
