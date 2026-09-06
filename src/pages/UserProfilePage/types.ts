export interface UserStats {
  username: string;
  email: string;
  joinDate: Date;
  totalSessions: number;
  totalMessages: number;
  totalTokensUsed: number;
  favoriteSkills: string[];
  streakDays: number;
  longestStreak: number;
  achievements: any[];
}
 export interface UserProfileProps {
  t: (key: string, params?: any) => string;
  onClose?: () => void;
  currentSessionId?: string;
}