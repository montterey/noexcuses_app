export type GoalFrequency = 'daily' | 'once';
export type GoalType = 'daily' | 'once';
export type GoalLogStatus = 'done' | 'skipped' | 'frozen';
export type GoalDisplayStatus = GoalLogStatus | 'overdue';

export interface User {
  id: string;
  username: string;
  firstName: string;
  avatar?: string;
  level: number;
  xp: number;
  streak: number;
  longestStreak: number;
  streakFreezeCount: number;
  totalGoalsCompleted: number;
  xpThisWeek: number;
}

export interface Goal {
  id: string;
  title: string;
  frequency: GoalFrequency;
  type: GoalType;
  time?: string;
  why?: string;
  streak: number;
  goalStreak: number;
  completed: boolean;
  completedToday: boolean;
  skippedToday: boolean;
  frozenToday: boolean;
  isOverdue: boolean;
  todayStatus: GoalLogStatus | null;
  displayStatus: GoalDisplayStatus | null;
  xpEarnedToday: number;
  active: boolean;
  paused: boolean;
  createdAt?: string | null;
  completedAt?: string | null;
  deadlineAt?: string | null;
  snoozeUntil?: string | null;
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
  date: string;
  day: string;
  done: number;
  skipped: number;
  frozen: number;
  completed: number;
  total: number;
  xpEarned: number;
  isToday: boolean;
}
