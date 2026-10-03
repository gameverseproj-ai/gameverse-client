import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { COLLECTION_API, CollectionApi } from '../api/collection.api';
import { CURRENCY_API } from '../api/currency.api';
import { CollectionDetail, CollectionSummary } from '../models/collection.model';
import { CollectionsFacade } from './collections.facade';

const paris: CollectionSummary = {
  id: 'paris', name: 'Paris', coverImageUrl: '', totalCards: 10,
  revealedCards: 1, progress: 0, nextCardIn: 2, state: 'active',
};
const album: CollectionDetail = {
  id: 'paris', name: 'Paris', description: '', factPriceCoins: 25, progress: 0, nextCardIn: 2,
  cards: [{
    position: 1, revealed: true, name: 'Eiffel Tower', imageUrl: '',
    facts: [
      { position: 1, revealed: false, text: null },
      { position: 2, revealed: false, text: null },
    ],
  }, { position: 2, revealed: false, name: null, imageUrl: null, facts: null }],
};

describe('CollectionsFacade', () => {
  let api: jasmine.SpyObj<CollectionApi>;
  let facade: CollectionsFacade;

  beforeEach(() => {
    api = jasmine.createSpyObj<CollectionApi>('CollectionApi', ['getCollections', 'getCollection', 'revealFact']);
    api.getCollections.and.returnValue(of([paris]));
    api.getCollection.and.returnValue(of(album));
    TestBed.configureTestingModule({ providers: [
      { provide: COLLECTION_API, useValue: api },
      { provide: CURRENCY_API, useValue: { getBalances: () => of({ coins: 350, gems: 0, xp: 0 }) } },
    ] });
    facade = TestBed.inject(CollectionsFacade);
  });

  it('loads the shelf, opens the active album and reports the wallet', () => {
    facade.loadCollections();
    expect(facade.collections()).toEqual([paris]);
    expect(facade.detail()?.id).toBe('paris');
    expect(facade.coins()).toBe(350);
    expect(api.getCollection).toHaveBeenCalledOnceWith('paris');
  });

  it('patches a bought fact into the open album and tracks the new balance', () => {
    facade.loadCollections();
    api.revealFact.and.returnValue(of({ success: true, coins: 325, text: 'Built in 1889.' }));

    facade.revealFact(1, 1).subscribe();

    const fact = facade.detail()!.cards[0].facts![0];
    expect(fact.revealed).toBeTrue();
    expect(fact.text).toBe('Built in 1889.');
    expect(facade.detail()!.cards[0].facts![1].revealed).toBeFalse();
    expect(facade.coins()).toBe(325);
  });

  it('keeps the album untouched when the wallet is short', () => {
    facade.loadCollections();
    api.revealFact.and.returnValue(of({ success: false, coins: 5, text: null }));

    let refused = false;
    facade.revealFact(1, 1).subscribe(result => refused = !result.success);

    expect(refused).toBeTrue();
    expect(facade.detail()!.cards[0].facts![0].revealed).toBeFalse();
    expect(facade.coins()).toBe(5);
  });
});
