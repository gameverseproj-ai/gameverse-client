import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthResponse, ProviderCredential } from '../models/auth.model';
import { Language } from '../models/language.model';

export interface AuthApi {
  anonymous(language: Language): Observable<AuthResponse>;
  me(): Observable<AuthResponse | null>;
  attach(credential: ProviderCredential): Observable<AuthResponse>;
}
export const AUTH_API = new InjectionToken<AuthApi>('AUTH_API');
