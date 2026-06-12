export type WorldId = string;
export type WorldTheme = 'fantasy' | 'sci-fi' | 'retro' | 'cyberpunk';

export interface World {
  id: WorldId;
  name: string;
  description: string;
  theme: WorldTheme;
  coverImageUrl: string;
  gameIds: string[];
}
