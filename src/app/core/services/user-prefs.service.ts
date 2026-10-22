import { Injectable, inject } from '@angular/core';
import { SessionStore } from '../api/http/session.store';
export type ExplorerAvatar = 'male' | 'female';
/** Device-side user preferences, isolated by signed player identity. */
@Injectable({ providedIn: 'root' })
export class UserPrefsService {
  private readonly session = inject(SessionStore);
  private key(preview: boolean) { return `gameverse.user-prefs.v1.${preview ? 'monstrocity-preview' : this.session.read()?.playerId ?? 'guest'}`; }
  avatar(preview = false): ExplorerAvatar | null {
    try { const value = JSON.parse(localStorage.getItem(this.key(preview)) ?? '{}').monstrocityAvatar; return value === 'male' || value === 'female' ? value : null; } catch { return null; }
  }
  setAvatar(value: ExplorerAvatar, preview = false): void {
    try { const key = this.key(preview); let prefs; try { prefs = JSON.parse(localStorage.getItem(key) ?? '{}'); } catch { prefs = {}; }
      localStorage.setItem(key, JSON.stringify({ ...prefs, monstrocityAvatar: value }));
    } catch { /* Storage can be disabled; the current screen still keeps the selection. */ }
  }
}
