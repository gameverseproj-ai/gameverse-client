export type UserId = string;

export interface User {
  id: UserId;
  username: string;
  avatarUrl: string;
  createdAt: Date;
}

export interface UserProfile extends User {
  totalScore: number;
  gamesPlayed: number;
  favoriteWorldId: string | null;
}
