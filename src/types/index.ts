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

export type ChallengeCategory =
  | 'fitness'
  | 'running'
  | 'sleep'
  | 'reading'
  | 'goals'
  | 'programs';

export type ChallengeVisibility = 'public' | 'link_only' | 'private';
export type ChallengeJoinMode = 'instant' | 'approval' | 'invite_only';
export type ChallengeFormat = 'duel' | 'group' | 'cooperative';
export type ChallengeMetric = 'goals_completed' | 'program_days_completed';
export type ChallengeMode = 'highest_score' | 'first_to_target';
export type ChallengeStatus = 'open' | 'full' | 'active' | 'completed' | 'cancelled' | 'expired';
export type ChallengeParticipantStatus =
  | 'invited'
  | 'pending'
  | 'approved'
  | 'active'
  | 'rejected'
  | 'declined'
  | 'left'
  | 'completed';
export type ChallengeResult = 'pending' | 'winner' | 'loser' | 'draw';
export type ChallengeSort = 'newest' | 'popular' | 'starting_soon' | 'recommended';
export type ChallengeScope = 'invitations' | 'active' | 'history' | 'all';

export interface ChallengeCatalogItem {
  id: string;
  title: string;
  description: string | null;
  category: ChallengeCategory;
  challengeFormat: ChallengeFormat;
  metricType: ChallengeMetric;
  mode: ChallengeMode;
  targetValue: number | null;
  durationDays: 1 | 3 | 7;
  maxParticipants: number;
  participantCount: number;
  availablePlaces: number;
  startsAt: string | null;
  registrationEndsAt: string | null;
  creatorUsername: string | null;
  creatorFirstName: string;
  createdAt: string;
}

export interface ChallengeParticipant {
  challengeId: string;
  userId: string;
  role: 'creator' | 'opponent' | 'member';
  status: ChallengeParticipantStatus;
  progress: number;
  rank: number | null;
  result: ChallengeResult;
  joinedAt: string | null;
}

export interface CreateChallengeInput {
  title: string;
  description?: string;
  category: ChallengeCategory;
  visibility: ChallengeVisibility;
  joinMode: ChallengeJoinMode;
  metricType: ChallengeMetric;
  mode: ChallengeMode;
  targetValue?: number;
  durationDays: 1 | 3 | 7;
  startsAt?: string;
  registrationEndsAt?: string;
  invitedUserId?: string;
}

export interface ChallengeActionResult {
  challengeId: string;
  challengeStatus: ChallengeStatus;
  participantStatus?: ChallengeParticipantStatus;
  inviteToken?: string;
}

export interface UserChallengeListItem {
  challengeId: string;
  title: string;
  category: ChallengeCategory;
  metricType: ChallengeMetric;
  mode: ChallengeMode;
  challengeStatus: ChallengeStatus;
  participantStatus: ChallengeParticipantStatus;
  progress: number;
  result: ChallengeResult;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}
