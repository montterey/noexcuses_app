import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { Goal, GoalFrequency, GoalLogStatus } from '../types';

const GOAL_XP_REWARD = 10;
const ONCE_GOAL_VISIBLE_HOURS = 24;

interface GoalLogRow {
  date: string;
  status: string | null;
  xp_earned?: number | null;
  created_at?: string | null;
}

type AddGoalResult = {
  success: boolean;
  error?: string;
};

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || '');
  }

  if (error instanceof Error) {
    return error.message;
  }

  return error ? String(error) : '';
}

function shouldTryMinimalGoalInsert(error: unknown) {
  const errorRecord = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const code = String(errorRecord.code || '');
  const message = getErrorMessage(error).toLowerCase();

  return (
    ['22P02', '42703', '42804', 'PGRST102', 'PGRST204'].includes(code) ||
    message.includes('schema') ||
    message.includes('column') ||
    message.includes('type') ||
    message.includes('invalid input syntax') ||
    message.includes('could not find') ||
    message.includes('schema cache')
  );
}

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function isPast(dateString?: string | null) {
  if (!dateString) return false;
  return new Date(dateString).getTime() <= Date.now();
}

function isWithinHours(dateString: string | null | undefined, hours: number) {
  if (!dateString) return false;
  return Date.now() - new Date(dateString).getTime() < hours * 60 * 60 * 1000;
}

function normalizeGoalFrequency(value: unknown): GoalFrequency {
  return value === 'once' ? 'once' : 'daily';
}

function calculateGoalStreak(logs: Array<{ date: string; status: string | null }>) {
  const streakDates = new Set(
    logs
      .filter((log) => log.status === 'done' || log.status === 'frozen')
      .map((log) => log.date)
  );

  const today = getTodayDate();
  const yesterday = addDays(today, -1);
  let cursor = streakDates.has(today) ? today : streakDates.has(yesterday) ? yesterday : null;
  let streak = 0;

  while (cursor && streakDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function getNextLevel(xp: number) {
  return Math.floor(xp / 150) + 1;
}

function getOnceDeadline(goal: Record<string, any>) {
  if (goal.snooze_until) return goal.snooze_until as string;
  if (!goal.created_at) return null;
  return addHours(new Date(goal.created_at), ONCE_GOAL_VISIBLE_HOURS).toISOString();
}

function getPostponeDeadline() {
  return addHours(new Date(), ONCE_GOAL_VISIBLE_HOURS).toISOString();
}

export function useGoals() {
  const { user } = useUser();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGoals = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const today = getTodayDate();

      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('created_at', { ascending: true });

      if (goalsError) throw goalsError;

      const visibleGoals = (goalsData || []).filter((goal) => {
        const frequency = normalizeGoalFrequency(goal.frequency || goal.type);
        const isPaused = Boolean(goal.paused);
        const snoozedDaily = frequency === 'daily' && goal.snooze_until && !isPast(goal.snooze_until);
        return !isPaused && !snoozedDaily;
      });

      const { data: todayLogs, error: logsError } = await supabase
        .from('goal_logs')
        .select('goal_id, status, xp_earned, created_at')
        .eq('user_id', user.id)
        .eq('date', today);

      if (logsError) throw logsError;

      const todayLogByGoalId = new Map(
        (todayLogs || []).map((log) => [
          log.goal_id,
          {
            status: log.status as GoalLogStatus,
            xpEarned: Number(log.xp_earned || 0),
            createdAt: log.created_at as string | null,
          },
        ])
      );

      const goalsWithStatus = await Promise.all(
        visibleGoals.map(async (goal): Promise<Goal | null> => {
          const frequency = normalizeGoalFrequency(goal.frequency || goal.type);
          const type = normalizeGoalFrequency(goal.type || goal.frequency);
          const todayLog = todayLogByGoalId.get(goal.id);

          const { data: historyLogs } = await supabase
            .from('goal_logs')
            .select('date, status, xp_earned, created_at')
            .eq('goal_id', goal.id)
            .order('created_at', { ascending: false })
            .limit(365);

          const logs = (historyLogs || []) as GoalLogRow[];
          const latestDoneLog = logs.find((log) => log.status === 'done');
          const calculatedStreak = frequency === 'daily'
            ? calculateGoalStreak(logs)
            : 0;
          const goalStreak = Number(goal.goal_streak || calculatedStreak || 0);

          if (frequency === 'once' && latestDoneLog) {
            if (!isWithinHours(latestDoneLog.created_at, ONCE_GOAL_VISIBLE_HOURS)) {
              const { error: cleanupError } = await supabase
                .from('goals')
                .update({ active: false })
                .eq('id', goal.id);

              if (cleanupError) {
                console.error('Error cleaning up completed once goal:', cleanupError);
              }

              return null;
            }

            return {
              id: goal.id,
              title: goal.title,
              frequency,
              type,
              time: goal.time || undefined,
              why: goal.why || undefined,
              streak: 0,
              goalStreak: 0,
              completed: true,
              completedToday: true,
              skippedToday: false,
              frozenToday: false,
              isOverdue: false,
              todayStatus: 'done',
              displayStatus: 'done',
              xpEarnedToday: Number(latestDoneLog.xp_earned || 0),
              active: Boolean(goal.active),
              paused: Boolean(goal.paused),
              createdAt: goal.created_at || null,
              completedAt: latestDoneLog.created_at || null,
              deadlineAt: latestDoneLog.created_at
                ? addHours(new Date(latestDoneLog.created_at), ONCE_GOAL_VISIBLE_HOURS).toISOString()
                : null,
              snoozeUntil: goal.snooze_until || null,
            };
          }

          const onceDeadline = frequency === 'once' ? getOnceDeadline(goal) : null;
          const isOverdue = frequency === 'once' && Boolean(onceDeadline) && isPast(onceDeadline);
          const displayStatus = isOverdue ? 'overdue' : todayLog?.status || null;

          return {
            id: goal.id,
            title: goal.title,
            frequency,
            type,
            time: goal.time || undefined,
            why: goal.why || undefined,
            streak: goalStreak,
            goalStreak,
            completed: todayLog?.status === 'done',
            completedToday: todayLog?.status === 'done',
            skippedToday: todayLog?.status === 'skipped',
            frozenToday: todayLog?.status === 'frozen',
            isOverdue,
            todayStatus: todayLog?.status || null,
            displayStatus,
            xpEarnedToday: todayLog?.xpEarned || 0,
            active: Boolean(goal.active),
            paused: Boolean(goal.paused),
            createdAt: goal.created_at || null,
            completedAt: todayLog?.createdAt || null,
            deadlineAt: onceDeadline,
            snoozeUntil: goal.snooze_until || null,
          };
        })
      );

      setGoals(goalsWithStatus.filter((goal): goal is Goal => Boolean(goal)));
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const fetchTodayLog = async (goalId: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('goal_logs')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('goal_id', goalId)
      .eq('date', getTodayDate())
      .limit(1);

    if (error) throw error;
    return data?.[0] || null;
  };

  const fetchUserSnapshot = async () => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('users')
      .select('xp, level, xp_this_week, streak_freeze_count, total_goals_completed')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data;
  };

  const processStreakFreezeRewards = async () => {
    if (!user) return;

    const { error } = await supabase.rpc('process_streak_freeze_rewards', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('Error processing streak freeze rewards:', error);
    }
  };

  const processAchievementFreezeRewards = async () => {
    if (!user) return;

    const { error } = await supabase.rpc('process_achievement_freeze_rewards', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('Error processing achievement freeze rewards:', error);
    }
  };

  const runAchievementCheck = async () => {
    if (!user) return;

    const { error } = await supabase.rpc('check_and_unlock_achievements', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('Error checking achievements:', error);
    }

    await processAchievementFreezeRewards();
  };

  const completeGoal = async (goalId: string) => {
    if (!user) return;

    const goal = goals.find((item) => item.id === goalId);
    if (!goal || goal.displayStatus) return;

    try {
      const existingLog = await fetchTodayLog(goalId);
      if (existingLog) return;

      const today = getTodayDate();
      const { error: insertError } = await supabase.from('goal_logs').insert({
        goal_id: goalId,
        user_id: user.id,
        status: 'done',
        date: today,
        xp_earned: GOAL_XP_REWARD,
      });

      if (insertError) throw insertError;

      const userSnapshot = await fetchUserSnapshot();
      const nextXp = Number(userSnapshot?.xp || user.xp || 0) + GOAL_XP_REWARD;
      const nextTotalCompleted = Number(
        userSnapshot?.total_goals_completed || user.totalGoalsCompleted || 0
      ) + 1;

      const { error: userError } = await supabase
        .from('users')
        .update({
          xp: nextXp,
          level: getNextLevel(nextXp),
          xp_this_week: Number(userSnapshot?.xp_this_week || user.xpThisWeek || 0) + GOAL_XP_REWARD,
          total_goals_completed: nextTotalCompleted,
        })
        .eq('id', user.id);

      if (userError) throw userError;

      if (goal.frequency === 'daily') {
        const { error: streakError } = await supabase.rpc('update_user_streak', {
          p_user_id: user.id,
        });

        if (streakError) throw streakError;
        await processStreakFreezeRewards();
      }

      await runAchievementCheck();
      await fetchGoals();
    } catch (error) {
      console.error('Error completing goal:', error);
    }
  };

  const skipGoal = async (goalId: string) => {
    if (!user) return;

    const goal = goals.find((item) => item.id === goalId);
    if (!goal || goal.frequency !== 'daily' || goal.displayStatus) return;

    try {
      const existingLog = await fetchTodayLog(goalId);
      if (existingLog) return;

      const { error } = await supabase.from('goal_logs').insert({
        goal_id: goalId,
        user_id: user.id,
        status: 'skipped',
        date: getTodayDate(),
        xp_earned: 0,
      });

      if (error) throw error;

      await runAchievementCheck();
      await fetchGoals();
    } catch (error) {
      console.error('Error skipping goal:', error);
    }
  };

  const freezeGoal = async (goalId: string) => {
    if (!user) return;

    const goal = goals.find((item) => item.id === goalId);
    if (!goal || goal.frequency !== 'daily' || goal.displayStatus) return;

    try {
      const { data: frozen, error: freezeError } = await supabase.rpc('freeze_daily_goal', {
        p_user_id: user.id,
        p_goal_id: goalId,
        p_date: getTodayDate(),
      });

      if (freezeError) throw freezeError;
      if (!frozen) return;

      await runAchievementCheck();
      await fetchGoals();
    } catch (error) {
      console.error('Error freezing goal:', error);
    }
  };

  const postponeGoal = async (goalId: string, time: string) => {
    if (!user) return false;

    const goal = goals.find((item) => item.id === goalId);
    if (!goal || goal.frequency !== 'once' || goal.completed) return false;

    try {
      const { error } = await supabase
        .from('goals')
        .update({
          time: time || null,
          snooze_until: getPostponeDeadline(),
          active: true,
        })
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchGoals();
      return true;
    } catch (error) {
      console.error('Error postponing goal:', error);
      return false;
    }
  };

  const addGoal = async (newGoal: {
    title: string;
    type: GoalFrequency;
    time?: string;
    why?: string;
  }): Promise<AddGoalResult> => {
    if (!user) return { success: false, error: 'User is not loaded' };

    try {
      const fullPayload = {
        user_id: user.id,
        title: newGoal.title,
        frequency: newGoal.type,
        type: newGoal.type,
        time: newGoal.time || null,
        why: newGoal.why || null,
        active: true,
        paused: false,
        snooze_until: newGoal.type === 'once' ? getPostponeDeadline() : null,
      };

      const minimalPayload = {
        user_id: user.id,
        title: newGoal.title,
        type: newGoal.type,
        time: newGoal.time || null,
        why: newGoal.why || null,
        active: true,
      };

      const { error: fullError } = await supabase.from('goals').insert(fullPayload);

      if (fullError) {
        console.error('Error adding goal with full payload:', fullError);

        if (!shouldTryMinimalGoalInsert(fullError)) {
          return { success: false, error: getErrorMessage(fullError) };
        }

        const { error: minimalError } = await supabase.from('goals').insert(minimalPayload);

        if (minimalError) {
          console.error('Error adding goal with minimal payload:', minimalError);
          return {
            success: false,
            error: getErrorMessage(minimalError) || getErrorMessage(fullError),
          };
        }
      }

      await fetchGoals();
      return { success: true };
    } catch (error) {
      console.error('Error adding goal:', error);
      return { success: false, error: getErrorMessage(error) };
    }
  };

  return {
    goals,
    loading,
    completeGoal,
    toggleGoal: completeGoal,
    skipGoal,
    freezeGoal,
    postponeGoal,
    addGoal,
    refreshGoals: fetchGoals,
  };
}
