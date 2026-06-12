import { Injectable, signal } from '@angular/core';
import { UserProfile } from '../../../core/models/user.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  readonly profile = signal<UserProfile | null>(null);
}
