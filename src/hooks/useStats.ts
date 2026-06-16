import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { WeeklyStats } from '../types';

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useStats() {
  const { user } = useUser();
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const now = new Date();
      const today = formatDate(now);
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() + mondayOffset);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const { data: logs, error } = await supabase
        .from('goal_logs')
        .select('date, status, xp_earned')
        .eq('user_id', user.id)
        .gte('date', formatDate(weekStart))
        .lte('date', formatDate(weekEnd));

      if (error) throw error;

      const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      const stats: WeeklyStats[] = [];

      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + i);
        const dateStr = formatDate(dayDate);
        const dayIndex = dayDate.getDay();
        const dayLogs = (logs || []).filter((log) => log.date === dateStr);

        const done = dayLogs.filter((log) => log.status === 'done').length;
        const skipped = dayLogs.filter((log) => log.status === 'skipped').length;
        const frozen = dayLogs.filter((log) => log.status === 'frozen').length;
        const xpEarned = dayLogs.reduce(
          (sum, log) => sum + Number(log.xp_earned || 0),
          0
        );

        stats.push({
          date: dateStr,
          day: dayNames[dayIndex],
          done,
          skipped,
          frozen,
          completed: done,
          total: done + skipped + frozen,
          xpEarned,
          isToday: dateStr === today,
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
