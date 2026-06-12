import { Injectable, signal } from '@angular/core';
import { World } from '../../../core/models/world.model';

@Injectable({ providedIn: 'root' })
export class WorldsService {
  readonly worlds = signal<World[]>([]);
}
