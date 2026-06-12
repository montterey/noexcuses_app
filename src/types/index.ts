export interface User {
  id: string;
  username: string;
  firstName: string;
  avatar?: string;
  level: number;
  xp: number;
  streak: number;
  longestStreak: number;
  totalGoalsCompleted: number;
  xpThisWeek: number;
}

export interface Goal {
  id: string;
  title: string;
  type: 'daily' | 'once';
  time?: string;
  why?: string;
  streak: number;
  completed: boolean;
  completedToday: boolean;
  active: boolean;
}

export interface Program {
  id: string;
  title: string;
  description: string;
  icon: string;
  totalDays: number;
  currentDay: number;
  isActive: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface WeeklyStats {
  day: string;
  completed: number;
  total: number;
}
