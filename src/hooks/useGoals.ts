import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { Goal } from '../types';

export function useGoals() {
  const { user } = useUser();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGoals = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('created_at', { ascending: true });

      if (goalsError) throw goalsError;

      // Fetch today's completions
      const today = new Date().toISOString().split('T')[0];
      const { data: todayLogs, error: logsError } = await supabase
        .from('goal_logs')
        .select('goal_id')
        .eq('user_id', user.id)
        .eq('date', today);

      if (logsError) throw logsError;

      const completedGoalIds = new Set(todayLogs?.map((log) => log.goal_id) || []);

      // Calculate streaks for each goal
      const goalsWithStreaks = await Promise.all(
        (goalsData || []).map(async (goal) => {
          // Count consecutive days completed
          const { data: logs } = await supabase
            .from('goal_logs')
            .select('date')
            .eq('goal_id', goal.id)
            .order('date', { ascending: false })
            .limit(365);

          let streak = 0;
          const todayDate = new Date();
          todayDate.setHours(0, 0, 0, 0);

          if (logs && logs.length > 0) {
            const logDates = logs.map((l) => {
              const d = new Date(l.date);
              d.setHours(0, 0, 0, 0);
              return d.getTime();
            });

            // Check if there's a log for today or yesterday to start counting streak
            const yesterday = new Date(todayDate);
            yesterday.setDate(yesterday.getDate() - 1);

            const hasToday = logDates.includes(todayDate.getTime());
            const hasYesterday = logDates.includes(yesterday.getTime());

            if (hasToday || hasYesterday) {
              streak = 1;
              const checkDate = hasToday ? new Date(todayDate) : new Date(yesterday);

              for (let i = 0; i < 365; i++) {
                checkDate.setDate(checkDate.getDate() - 1);
                if (logDates.includes(checkDate.getTime())) {
                  streak++;
                } else {
                  break;
                }
              }
            }
          }

          return {
            id: goal.id,
            title: goal.title,
            type: goal.frequency,
            time: goal.time,
            why: goal.why,
            streak,
            completed: completedGoalIds.has(goal.id),
            completedToday: completedGoalIds.has(goal.id),
            active: goal.active,
          };
        })
      );

      setGoals(goalsWithStreaks);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const toggleGoal = async (goalId: string) => {
  if (!user) return;

  const goal = goals.find((g) => g.id === goalId);
  if (!goal) return;

  // Если уже выполнено — ничего не делаем
  if (goal.completedToday) return;

  const today = new Date().toISOString().split('T')[0];

  try {
    // Добавляем выполнение
    await supabase.from('goal_logs').insert({
      goal_id: goalId,
      user_id: user.id,
      status: 'done',
      date: today,
    });

    // Начисляем +10 XP
    const newXp = (user.xp || 0) + 10;
    const newLevel = Math.floor(newXp / 150) + 1;
   await supabase
      .from('users')
      .update({ xp: newXp, level: newLevel })
      .eq('id', user.id);

    // Проверяем достижения
    await supabase.rpc('check_and_unlock_achievements', {
      p_user_id: user.id
    });

    await fetchGoals();

    await fetchGoals();
  } catch (error) {
    console.error('Error toggling goal:', error);
  }
};

  const addGoal = async (newGoal: {
    title: string;
    type: 'daily' | 'once';
    time?: string;
    why?: string;
  }) => {
    if (!user) return;

    try {
      await supabase.from('goals').insert({
        user_id: user.id,
        title: newGoal.title,
        frequency: newGoal.type,
        time: newGoal.time || null,
        why: newGoal.why || null,
        active: true,
      });

      await fetchGoals();
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  };

  return { goals, loading, toggleGoal, addGoal, refreshGoals: fetchGoals };
}
