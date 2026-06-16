import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { Goal, GoalFrequency, GoalLogStatus } from '../types';

const GOAL_XP_REWARD = 10;

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
        const isPaused = Boolean(goal.paused);
        const snoozed = goal.snooze_until && goal.snooze_until > today;
        return !isPaused && !snoozed;
      });

      const { data: todayLogs, error: logsError } = await supabase
        .from('goal_logs')
        .select('goal_id, status, xp_earned')
        .eq('user_id', user.id)
        .eq('date', today);

      if (logsError) throw logsError;

      const todayLogByGoalId = new Map(
        (todayLogs || []).map((log) => [
          log.goal_id,
          {
            status: log.status as GoalLogStatus,
            xpEarned: Number(log.xp_earned || 0),
          },
        ])
      );

      const goalsWithStatus = await Promise.all(
        visibleGoals.map(async (goal) => {
          const frequency = normalizeGoalFrequency(goal.frequency || goal.type);
          const type = normalizeGoalFrequency(goal.type || goal.frequency);
          const todayLog = todayLogByGoalId.get(goal.id);

          const { data: historyLogs } = await supabase
            .from('goal_logs')
            .select('date, status')
            .eq('goal_id', goal.id)
            .order('date', { ascending: false })
            .limit(365);

          const calculatedStreak = frequency === 'daily'
            ? calculateGoalStreak(historyLogs || [])
            : 0;
          const goalStreak = Number(goal.goal_streak || calculatedStreak || 0);

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
            todayStatus: todayLog?.status || null,
            xpEarnedToday: todayLog?.xpEarned || 0,
            active: Boolean(goal.active),
            paused: Boolean(goal.paused),
            snoozeUntil: goal.snooze_until || null,
          };
        })
      );

      setGoals(goalsWithStatus);
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

  const runAchievementCheck = async () => {
    if (!user) return;

    await supabase.rpc('check_and_unlock_achievements', {
      p_user_id: user.id,
    });
  };

  const completeGoal = async (goalId: string) => {
    if (!user) return;

    const goal = goals.find((item) => item.id === goalId);
    if (!goal || goal.todayStatus) return;

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

      if (goal.frequency === 'once') {
        const { error: goalError } = await supabase
          .from('goals')
          .update({ active: false })
          .eq('id', goalId);

        if (goalError) throw goalError;
      } else {
        await supabase.rpc('update_user_streak', {
          p_user_id: user.id,
        });
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
    if (!goal || goal.todayStatus) return;

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
    if (!goal || goal.frequency !== 'daily' || goal.todayStatus) return;

    try {
      const existingLog = await fetchTodayLog(goalId);
      if (existingLog) return;

      const userSnapshot = await fetchUserSnapshot();
      const freezeCount = Number(userSnapshot?.streak_freeze_count || user.streakFreezeCount || 0);

      if (freezeCount <= 0) return;

      const { error: insertError } = await supabase.from('goal_logs').insert({
        goal_id: goalId,
        user_id: user.id,
        status: 'frozen',
        date: getTodayDate(),
        xp_earned: 0,
      });

      if (insertError) throw insertError;

      const { error: userError } = await supabase
        .from('users')
        .update({ streak_freeze_count: freezeCount - 1 })
        .eq('id', user.id);

      if (userError) throw userError;

      await runAchievementCheck();
      await fetchGoals();
    } catch (error) {
      console.error('Error freezing goal:', error);
    }
  };

  const addGoal = async (newGoal: {
    title: string;
    type: GoalFrequency;
    time?: string;
    why?: string;
  }) => {
    if (!user) return;

    try {
      await supabase.from('goals').insert({
        user_id: user.id,
        title: newGoal.title,
        frequency: newGoal.type,
        type: newGoal.type,
        time: newGoal.time || null,
        why: newGoal.why || null,
        active: true,
        paused: false,
      });

      await fetchGoals();
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  };

  return {
    goals,
    loading,
    completeGoal,
    toggleGoal: completeGoal,
    skipGoal,
    freezeGoal,
    addGoal,
    refreshGoals: fetchGoals,
  };
}
