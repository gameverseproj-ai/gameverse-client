export type MusicGenre = 'rock' | 'pop' | 'funk';
/** Account preference; independent of each game's sound effects. */
export interface MusicPreferences { enabled: boolean; genre: MusicGenre; volume: number }
export const DEFAULT_MUSIC: MusicPreferences = { enabled: false, genre: 'pop', volume: .35 };
export function validMusic(value: unknown): value is MusicPreferences {
  const p = value as MusicPreferences | null;
  return !!p && typeof p.enabled === 'boolean' && ['rock', 'pop', 'funk'].includes(p.genre)
    && Number.isFinite(p.volume) && p.volume >= 0 && p.volume <= 1;
}
