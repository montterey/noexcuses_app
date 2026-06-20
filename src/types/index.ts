export type GoalFrequency = 'daily' | 'once';
export type GoalType = 'daily' | 'once';
export type GoalLogStatus = 'done' | 'skipped' | 'frozen';
export type GoalDisplayStatus = GoalLogStatus | 'overdue';
export type ProgramCode = 'fitness' | 'running' | 'sleep' | 'reading';
export type ProgramDayType = 'workout' | 'cardio' | 'rest' | 'stretch';

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
  code: ProgramCode;
  title: string;
  description: string;
  icon: string;
  totalDays: number;
  currentDay: number;
  isActive: boolean;
  completed: boolean;
}

export interface ProgramExercise {
  name: string;
  sets?: number;
  reps: string | number;
  type?: 'exercise' | 'task';
  youtube_id?: string | null;
  description?: string | null;
  tips?: string | null;
  muscles?: string | null;
}

export interface ProgramDayContent {
  day_number: number;
  title: string;
  type: ProgramDayType;
  exercises: ProgramExercise[];
}

export interface ProgramCompletionResult {
  success: boolean;
  applied?: boolean;
  currentDay?: number;
  completed?: boolean;
  xpAwarded?: number;
  error?: string;
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
