import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CollectionApi } from '../collection.api';
import { CollectionDetail, CollectionSummary, RevealFactResult } from '../../models/collection.model';
import { API_BASE_URL } from './api-config';

@Injectable({ providedIn: 'root' })
export class HttpCollectionApi implements CollectionApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  getCollections(): Observable<CollectionSummary[]> {
    return this.http.get<CollectionSummary[]>(`${this.base}/api/collections`);
  }

  getCollection(collectionId: string): Observable<CollectionDetail> {
    return this.http.get<CollectionDetail>(`${this.base}/api/collections/${encodeURIComponent(collectionId)}`);
  }

  /** Buying an already-open fact simply returns it, so retries never double-charge. */
  revealFact(collectionId: string, cardPosition: number, factPosition: number): Observable<RevealFactResult> {
    return this.http.post<RevealFactResult>(
      `${this.base}/api/collections/${encodeURIComponent(collectionId)}/cards/${cardPosition}/facts/${factPosition}`, null);
  }
}
