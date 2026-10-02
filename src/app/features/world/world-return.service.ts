import { Injectable } from '@angular/core';

/** Tab-local return point also survives a game refresh or browser Back. */
@Injectable({ providedIn: 'root' })
export class WorldReturnService {
  private portalId: string | null = null;
  private readonly key = 'gameverse.world-return.v1';

  read(): string | null {
    try { return sessionStorage.getItem(this.key) ?? this.portalId; }
    catch { return this.portalId; }
  }

  remember(portalId: string): void {
    this.portalId = portalId;
    try { sessionStorage.setItem(this.key, portalId); } catch { /* Storage is optional. */ }
  }

  clear(): void {
    this.portalId = null;
    try { sessionStorage.removeItem(this.key); } catch { /* Storage is optional. */ }
  }
}
