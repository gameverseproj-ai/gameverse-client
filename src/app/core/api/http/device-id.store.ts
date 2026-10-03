import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const KEY = 'gameverse.auth.device.v1';

/**
 * A random ID that keys a guest account to this browser profile, so a game
 * start without a stored session returns to the same guest instead of minting
 * a new one. It is generated here, never read from hardware, and serves
 * anonymous accounts only: converting retires the binding on the server and
 * {@link #clear} forgets it here, so no signed-in account is reachable by it.
 */
@Injectable({ providedIn: 'root' })
export class DeviceIdStore {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private memory: string | null = null;

  get(): string | null {
    if (!this.browser) return null;
    if (!this.memory) {
      try { this.memory = localStorage.getItem(KEY); } catch { /* Stays stable within this page at least. */ }
      this.memory ??= crypto.randomUUID();
      try { localStorage.setItem(KEY, this.memory); } catch { /* Same. */ }
    }
    return this.memory;
  }

  clear(): void {
    this.memory = null;
    if (!this.browser) return;
    try { localStorage.removeItem(KEY); } catch { /* Nothing to clean up. */ }
  }
}
