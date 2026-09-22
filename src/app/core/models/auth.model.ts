import { Language } from './language.model';

/** Matches be-core AuthResponse. Mock tokens must never be sent to a real server. */
export interface AuthResponse {
  token: string;
  userId: string;
  playerId: string;
  anonymous: boolean;
  language: Language;
  profile: { username: string; firstName: string | null; lastName: string | null; email: string | null; avatarUrl: string | null; language: Language };
  identities: ('GOOGLE' | 'TELEGRAM' | 'DEV')[];
}
export type ProviderCredential =
  | { kind: 'google'; body: { idToken: string } }
  | { kind: 'telegram'; body: { initData: string } }
  | { kind: 'telegram/web'; body: { id: number; hash: string; auth_date?: number; first_name?: string; last_name?: string; username?: string; photo_url?: string } };
export const authEndpoint = (credential: ProviderCredential, attach: boolean) => `/api/auth/${attach ? 'attach/' : ''}${credential.kind}`;
export type ClientMode = 'telegram' | 'phone' | 'desktop' | 'tablet';
/** Layout hints only: device classification never authenticates a user. */
export function clientMode(telegram: boolean, shortSide: number, touch: boolean): ClientMode {
  if (telegram) return 'telegram';
  if (shortSide < 600) return 'phone';
  return touch ? 'tablet' : 'desktop';
}
