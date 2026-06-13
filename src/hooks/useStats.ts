import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { WeeklyStats } from '../types';

export function useStats() {
  const { user } = useUser();
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() + mondayOffset);
      weekStart.setHours(0, 0, 0, 0);

      const { data: logs, error } = await supabase
        .from('goal_logs')
        .select('date')
        .eq('user_id', user.id)
        .gte('date', weekStart.toISOString().split('T')[0]);

      if (error) throw error;

      const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      const stats: WeeklyStats[] = [];

      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + i);
        const dateStr = dayDate.toISOString().split('T')[0];
        const dayIndex = dayDate.getDay();

        const completed = (logs || []).filter(
          (log) => log.date === dateStr
        ).length;

        stats.push({
          day: dayNames[dayIndex],
          completed,
          total: 5,
        });
      }

      setWeeklyStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { weeklyStats, loading, refreshStats: fetchStats };
}
