import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { CollectionDetail, CollectionSummary, RevealFactResult } from '../models/collection.model';

export interface CollectionApi {
  getCollections(): Observable<CollectionSummary[]>;
  getCollection(collectionId: string): Observable<CollectionDetail>;
  revealFact(collectionId: string, cardPosition: number, factPosition: number): Observable<RevealFactResult>;
}

export const COLLECTION_API = new InjectionToken<CollectionApi>('COLLECTION_API');
